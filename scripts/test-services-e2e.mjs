import assert from 'node:assert/strict';

const BASE = process.env.NEXORA_BASE_URL ?? 'http://127.0.0.1:8080';
const TS = Date.now();

async function req(path, opts = {}, token) {
  const headers = { ...(opts.headers ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(opts.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const data = await res.json();
  return { status: res.status, data };
}

async function gql(query, variables, token) {
  const res = await req('/graphql', { method: 'POST', body: JSON.stringify({ query, variables }) }, token);
  return res;
}

async function run() {
  console.log('1) Creating two organizations (Org A & Org B)...');
  const regA = await req('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: `admin-a-${TS}@nexora.local`,
      password: 'Password123!',
      fullName: 'Admin Org A',
      orgName: 'SolarOps Alpha',
      orgInitials: 'SOL',
    }),
  });
  assert.equal(regA.status, 201);
  const orgA = regA.data.org.orgId;
  console.log(`   Org A created: ${orgA} (Shard ${regA.data.org.shardId})`);

  const regB = await req('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: `driver-b-${TS}@nexora.local`,
      password: 'Password123!',
      fullName: 'Driver Org B',
      orgName: 'LogiTransit Beta',
      orgInitials: 'LOG',
    }),
  });
  assert.equal(regB.status, 201);
  const orgB = regB.data.org.orgId;
  const driverBId = regB.data.userId;
  console.log(`   Org B created: ${orgB} (Shard ${regB.data.org.shardId}), Driver B: ${driverBId}`);

  const loginA = await req('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: `admin-a-${TS}@nexora.local`, password: 'Password123!' }),
  });
  const tokenA = loginA.data.accessToken;

  const loginB = await req('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: `driver-b-${TS}@nexora.local`, password: 'Password123!' }),
  });
  const tokenB = loginB.data.accessToken;

  console.log('2) Registering Worker A & DualRoleUser A directly inside Org A...');
  const regWorkerA = await req('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: `worker-a-${TS}@nexora.local`,
      password: 'Password123!',
      fullName: 'Worker A',
      orgId: orgA,
    }),
  });
  assert.equal(regWorkerA.status, 201);
  const workerAId = regWorkerA.data.userId;

  const regDualA = await req('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: `dual-a-${TS}@nexora.local`,
      password: 'Password123!',
      fullName: 'Dual Role User A',
      orgId: orgA,
    }),
  });
  assert.equal(regDualA.status, 201);
  const dualAId = regDualA.data.userId;

  const tokenWorkerA = (
    await req('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: `worker-a-${TS}@nexora.local`, password: 'Password123!' }),
    })
  ).data.accessToken;

  const tokenDualA = (
    await req('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: `dual-a-${TS}@nexora.local`, password: 'Password123!' }),
    })
  ).data.accessToken;

  console.log('3) Creating custom roles, listing roles, and assigning MULTIPLE roles to DualRoleUser A...');
  const roleReporter = await req(
    '/api/v1/roles',
    {
      method: 'POST',
      body: JSON.stringify({
        name: 'Field Reporter',
        flags: { 'task.execute_own': true, 'task.upload_evidence': true },
      }),
    },
    tokenA,
  );
  assert.equal(roleReporter.status, 201);

  const roleVerifier = await req(
    '/api/v1/roles',
    {
      method: 'POST',
      body: JSON.stringify({
        name: 'Stage Verifier',
        flags: { 'task.verify_approve': true, 'stage.view_only': true, 'project.view_all': true },
      }),
    },
    tokenA,
  );
  assert.equal(roleVerifier.status, 201);

  const listedRoles = await req('/api/v1/roles', {}, tokenA);
  assert.ok(listedRoles.data.roles.length >= 3);
  console.log(`   Org A roles (${listedRoles.data.roles.length}): ${listedRoles.data.roles.map((r) => r.name).join(', ')}`);

  const assignMulti = await req(
    `/api/v1/org/members/${dualAId}/roles`,
    {
      method: 'PUT',
      body: JSON.stringify({
        roleIds: [roleReporter.data.roleId, roleVerifier.data.roleId],
      }),
    },
    tokenA,
  );
  assert.equal(assignMulti.status, 200);
  assert.equal(assignMulti.data.roleIds.length, 2);

  const membersRes = await req('/api/v1/org/members', {}, tokenA);
  const dualMember = membersRes.data.members.find((m) => m.userId === dualAId);
  assert.ok(dualMember.roleNames.includes('Field Reporter'));
  assert.ok(dualMember.roleNames.includes('Stage Verifier'));
  console.log(`   Verified multi-role assignment for ${dualAId}: [${dualMember.roleNames.join(' + ')}]`);

  console.log('4) Creating multiple projects under Org A and Org B...');
  const pA1 = (
    await gql(`mutation { createProject(title: "50kW Rooftop Rollout") { projectId title } }`, {}, tokenA)
  ).data.data.createProject.projectId;
  const pA2Private = (
    await gql(`mutation { createProject(title: "Internal Org A Audit") { projectId title } }`, {}, tokenA)
  ).data.data.createProject.projectId;
  const pB1 = (
    await gql(`mutation { createProject(title: "Org B Fleet Upgrade") { projectId title } }`, {}, tokenB)
  ).data.data.createProject.projectId;
  console.log(`   Projects created -> OrgA: [${pA1}, ${pA2Private}], OrgB: [${pB1}]`);

  console.log('5) Creating milestones/stages and tasks in Project 1...');
  const s1 = (
    await gql(
      `mutation($p: ID!) { createStage(projectId: $p, name: "Stage 1: Site Prep", orderIndex: 1) { stageId } }`,
      { p: pA1 },
      tokenA,
    )
  ).data.data.createStage.stageId;
  const s2 = (
    await gql(
      `mutation($p: ID!) { createStage(projectId: $p, name: "Stage 2: Material Transit", orderIndex: 2) { stageId } }`,
      { p: pA1 },
      tokenA,
    )
  ).data.data.createStage.stageId;
  const s3 = (
    await gql(
      `mutation($p: ID!) { createStage(projectId: $p, name: "Stage 3: Final Handover", orderIndex: 3) { stageId } }`,
      { p: pA1 },
      tokenA,
    )
  ).data.data.createStage.stageId;

  console.log('6) Inviting Org B user (Driver B) onto Stage 2 ONLY of Project 1...');
  const inviteRes = await gql(
    `mutation($p: ID!, $po: String!, $u: String!, $s: [String!]!) {
      invitePartnerOrg(projectId: $p, partnerOrgId: $po, userId: $u, roleName: "Transit Partner", allocatedStageIds: $s)
    }`,
    { p: pA1, po: orgB, u: driverBId, s: [s2] },
    tokenA,
  );
  assert.equal(inviteRes.data.data.invitePartnerOrg, true);

  console.log('7) Assigning Stage 1 task to Worker A and Stage 2 task to Driver B (Org B)...');
  const tWorkerA = (
    await gql(
      `mutation($p: ID!, $s: ID!, $u: String) {
        createTask(projectId: $p, stageId: $s, title: "Mount Roof Rails", taskType: "ON_FIELD", assignedUserId: $u) { taskId status }
      }`,
      { p: pA1, s: s1, u: workerAId },
      tokenA,
    )
  ).data.data.createTask.taskId;

  const tDriverB = (
    await gql(
      `mutation($p: ID!, $s: ID!, $u: String) {
        createTask(projectId: $p, stageId: $s, title: "Deliver Inverters to Site", taskType: "TRANSIT", assignedUserId: $u) { taskId status }
      }`,
      { p: pA1, s: s2, u: driverBId },
      tokenA,
    )
  ).data.data.createTask.taskId;

  console.log('8) Verifying cross-org isolation & stage-scoped visibility...');
  const driverProjects = (await gql(`query { projects { projectId orgId title } }`, {}, tokenB)).data.data.projects;
  assert.ok(driverProjects.some((p) => p.projectId === pA1), 'Driver B must see shared Project 1');
  assert.ok(!driverProjects.some((p) => p.projectId === pA2Private), 'Driver B must NOT see unshared Org A project');

  const driverTree = (
    await gql(
      `query($p: ID!) { project(projectId: $p) { projectId stages { stageId name tasks { taskId title } } } }`,
      { p: pA1 },
      tokenB,
    )
  ).data.data.project;
  assert.equal(driverTree.stages.length, 1, 'Driver B must ONLY see allocated Stage 2');
  assert.equal(driverTree.stages[0].stageId, s2);

  const deniedPrivate = await gql(`query($p: ID!) { project(projectId: $p) { projectId } }`, { p: pA2Private }, tokenB);
  assert.ok(deniedPrivate.data.errors?.length > 0, 'Driver B must be blocked from private Project 2');

  const deniedStage1 = await req(
    `/api/v1/projects/${pA1}/tasks/${tWorkerA}/status`,
    { method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED' }) },
    tokenB,
  );
  assert.equal(deniedStage1.status, 403, 'Driver B must be blocked from Stage 1 task');

  console.log('9) Executing & completing tasks by Worker A (Org A) and Driver B (Org B)...');
  const transitRes = await req(
    `/api/v1/projects/${pA1}/tasks/${tDriverB}/status`,
    { method: 'PATCH', body: JSON.stringify({ status: 'IN_TRANSIT', notes: 'Dispatched from warehouse' }) },
    tokenB,
  );
  assert.equal(transitRes.status, 200);
  assert.equal(transitRes.data.status, 'IN_TRANSIT');

  const completeB = await req(
    `/api/v1/projects/${pA1}/tasks/${tDriverB}/status`,
    { method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED', notes: 'Inverters handed over on site' }) },
    tokenB,
  );
  assert.equal(completeB.status, 200);
  assert.equal(completeB.data.status, 'COMPLETED');
  assert.ok(completeB.data.completedAt);

  const completeA = await req(
    `/api/v1/projects/${pA1}/tasks/${tWorkerA}/status`,
    { method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED', notes: 'Rails torqued & grounded' }) },
    tokenWorkerA,
  );
  assert.equal(completeA.status, 200);
  assert.equal(completeA.data.status, 'COMPLETED');

  console.log('10) Verifying tasks via DualRoleUser A (multi-role permissions)...');
  const verifyB = await req(
    `/api/v1/projects/${pA1}/tasks/${tDriverB}/status`,
    { method: 'PATCH', body: JSON.stringify({ status: 'VERIFIED', notes: 'Verified delivery receipt' }) },
    tokenDualA,
  );
  assert.equal(verifyB.status, 200);
  assert.equal(verifyB.data.status, 'VERIFIED');

  const verifyA = await req(
    `/api/v1/projects/${pA1}/tasks/${tWorkerA}/status`,
    { method: 'PATCH', body: JSON.stringify({ status: 'VERIFIED', notes: 'Verified rail mounting' }) },
    tokenDualA,
  );
  assert.equal(verifyA.status, 200);
  assert.equal(verifyA.data.status, 'VERIFIED');

  console.log('ALL MULTI-ORG, MULTI-ROLE, CROSS-ORG COLLABORATION & TASK COMPLETION TESTS PASSED!');
}

run().catch((err) => {
  console.error('E2E TEST FAILED:', err);
  process.exit(1);
});
