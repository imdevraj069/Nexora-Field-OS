import jwt from 'jsonwebtoken';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { IDENTITY_PROTO_PATH } from '@nexora/proto';
import { AuthTokenPayload, resolveShardFromOrgId } from '@nexora/shared-types';
import { dataRouter, envConfig } from '../config/env';

function mergeRoleFlags(roleRows: Array<{ name: string; flags: Record<string, boolean> }>) {
  const mergedFlags: Record<string, boolean> = {};
  for (const row of roleRows) {
    for (const [k, v] of Object.entries(row.flags ?? {})) {
      if (v === true) mergedFlags[k] = true;
    }
  }
  return {
    roleNames: roleRows.map((r) => r.name).join(', '),
    mergedFlags,
  };
}

export function startIdentityGrpcServer(): void {
  const pkgDef = protoLoader.loadSync(IDENTITY_PROTO_PATH, { keepCase: true, longs: String, enums: String });
  const proto = grpc.loadPackageDefinition(pkgDef) as unknown as {
    nexora: { identity: { IdentityService: { service: grpc.ServiceDefinition } } };
  };

  const server = new grpc.Server();
  server.addService(proto.nexora.identity.IdentityService.service, {
    VerifyAccessToken: (
      call: grpc.ServerUnaryCall<{ token: string }, unknown>,
      callback: grpc.sendUnaryData<unknown>,
    ) => {
      try {
        const decoded = jwt.verify(call.request.token, envConfig.jwtAccessSecret) as AuthTokenPayload;
        callback(null, {
          valid: true,
          user_id: decoded.sub,
          email: decoded.email,
          active_org_id: decoded.activeOrgId,
          shard_id: decoded.shardId,
          role_id: decoded.roleId,
        });
      } catch {
        callback(null, { valid: false });
      }
    },

    ResolveOrgShard: async (
      call: grpc.ServerUnaryCall<{ org_id: string }, unknown>,
      callback: grpc.sendUnaryData<unknown>,
    ) => {
      try {
        const orgId = call.request.org_id.toUpperCase();
        const shardId = resolveShardFromOrgId(orgId);
        const res = await dataRouter.postgres
          .getGlobalPool()
          .query('SELECT org_id FROM org_directory WHERE org_id = $1', [orgId]);
        callback(null, { org_id: orgId, shard_id: shardId, exists: res.rows.length > 0 });
      } catch (err) {
        callback(err as grpc.ServiceError);
      }
    },

    GetUserProjectAccess: async (
      call: grpc.ServerUnaryCall<{ user_id: string; user_org_id: string; project_id: string }, unknown>,
      callback: grpc.sendUnaryData<unknown>,
    ) => {
      try {
        const { user_id, user_org_id, project_id } = call.request;
        const globalPool = dataRouter.postgres.getGlobalPool();

        // 1. Cross-org collaborator check
        const collab = await globalPool.query(
          `SELECT owner_org_id, owner_shard_id, project_role_name, permission_flags, allocated_stage_ids
           FROM project_collaborators WHERE project_id = $1 AND user_id = $2`,
          [project_id, user_id],
        );
        if (collab.rows.length > 0) {
          const c = collab.rows[0];
          callback(null, {
            allowed: true,
            owner_org_id: c.owner_org_id,
            owner_shard_id: c.owner_shard_id,
            role_name: c.project_role_name,
            flags: c.permission_flags,
            allocated_stage_ids: c.allocated_stage_ids,
            is_external_collaborator: c.owner_org_id !== user_org_id,
          });
          return;
        }

        // 2. Home org multi-role flag aggregation
        const ownerShardId = resolveShardFromOrgId(user_org_id);
        const shardPool = dataRouter.postgres.getReadPool(ownerShardId, true);
        const memberRes = await shardPool.query(
          `SELECT m.allocated_stage_ids, r.name, r.flags
           FROM org_members m
           JOIN projects p ON p.org_id = m.org_id AND p.project_id = $3
           LEFT JOIN org_member_roles omr ON omr.org_id = m.org_id AND omr.user_id = m.user_id
           JOIN roles r ON r.role_id = COALESCE(omr.role_id, m.role_id)
           WHERE m.org_id = $1 AND m.user_id = $2 AND m.status = 'ACTIVE'`,
          [user_org_id, user_id, project_id],
        );
        if (memberRes.rows.length === 0) {
          callback(null, { allowed: false });
          return;
        }

        const { roleNames, mergedFlags } = mergeRoleFlags(memberRes.rows);
        callback(null, {
          allowed: true,
          owner_org_id: user_org_id,
          owner_shard_id: ownerShardId,
          role_name: roleNames,
          flags: mergedFlags,
          allocated_stage_ids: memberRes.rows[0].allocated_stage_ids ?? [],
          is_external_collaborator: false,
        });
      } catch (err) {
        callback(err as grpc.ServiceError);
      }
    },
  });

  server.bindAsync(`0.0.0.0:${envConfig.grpcPort}`, grpc.ServerCredentials.createInsecure(), () => {
    console.log(`[identity-service] gRPC listening on :${envConfig.grpcPort}`);
  });
}
