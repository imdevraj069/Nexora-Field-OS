import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateOrgId,
  parseOrgId,
  resolveShardFromOrgId,
  PERMISSION_FLAGS,
  hasPermission,
  canAccessStage,
} from './index';

test('generateOrgId produces {ORG}-{YY}-{UNIQUEID} format and valid shard', () => {
  const orgId = generateOrgId('sol', new Date('2026-11-25T00:00:00Z'));
  const parsed = parseOrgId(orgId);
  assert.equal(parsed.initials, 'SOL');
  assert.equal(parsed.year, '26');
  assert.equal(parsed.uniqueId.length, 5);

  const shard = resolveShardFromOrgId(orgId);
  assert.ok(shard === 1 || shard === 2 || shard === 3);
});

test('resolveShardFromOrgId routes 0-C -> 1, D-O -> 2, P-Z -> 3 using UNIQUEID[0]', () => {
  assert.equal(resolveShardFromOrgId('ZZZ-26-0AAAA'), 1);
  assert.equal(resolveShardFromOrgId('ZZZ-26-9ZZZZ'), 1);
  assert.equal(resolveShardFromOrgId('ZZZ-26-C1234'), 1);
  assert.equal(resolveShardFromOrgId('AAA-26-D1234'), 2);
  assert.equal(resolveShardFromOrgId('AAA-26-O1234'), 2);
  assert.equal(resolveShardFromOrgId('AAA-26-P1234'), 3);
  assert.equal(resolveShardFromOrgId('AAA-26-Z1234'), 3);
});

test('cross-org collaborator cannot acquire org-level permissions and is stage-scoped', () => {
  const ctx = {
    roleName: 'Transit Partner',
    isExternalCollaborator: true,
    allocatedStageIds: ['STG-2'],
    flags: {
      [PERMISSION_FLAGS.ORG_MANAGE_SETTINGS]: true, // should still be blocked for external
      [PERMISSION_FLAGS.STAGE_MANAGE_ALLOCATED_ONLY]: true,
      [PERMISSION_FLAGS.TASK_UPLOAD_EVIDENCE]: true,
    },
  };

  assert.equal(hasPermission(ctx, PERMISSION_FLAGS.ORG_MANAGE_SETTINGS), false);
  assert.equal(hasPermission(ctx, PERMISSION_FLAGS.STAGE_MANAGE_ALL, 'STG-2'), true);
  assert.equal(hasPermission(ctx, PERMISSION_FLAGS.STAGE_MANAGE_ALL, 'STG-1'), false);
  assert.equal(canAccessStage(ctx, 'STG-2'), true);
  assert.equal(canAccessStage(ctx, 'STG-1'), false);
});
