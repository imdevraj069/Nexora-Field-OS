import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { AI_PROTO_PATH, IDENTITY_PROTO_PATH, STORAGE_PROTO_PATH } from '@nexora/proto';
import { gatewayEnv } from '../config/env';

function loadGrpcClient<T>(protoPath: string, pkgPath: string[], address: string): T {
  const pkgDef = protoLoader.loadSync(protoPath, { keepCase: true, longs: String, enums: String });
  let cur = grpc.loadPackageDefinition(pkgDef) as Record<string, unknown>;
  for (const part of pkgPath) {
    cur = cur[part] as Record<string, unknown>;
  }
  const ClientCtor = cur as unknown as new (addr: string, creds: grpc.ChannelCredentials) => T;
  return new ClientCtor(address, grpc.credentials.createInsecure());
}

export const identityClient = loadGrpcClient<{
  VerifyAccessToken: (req: { token: string }, cb: grpc.sendUnaryData<Record<string, unknown>>) => void;
  GetUserProjectAccess: (
    req: { user_id: string; user_org_id: string; project_id: string },
    cb: grpc.sendUnaryData<Record<string, unknown>>,
  ) => void;
}>(IDENTITY_PROTO_PATH, ['nexora', 'identity', 'IdentityService'], gatewayEnv.identityGrpcUrl);

export const storageClient = loadGrpcClient<{
  MintSignedClientUrl: (
    req: { file_id: string; org_id: string; project_id: string; user_id: string; ttl_seconds?: number },
    cb: grpc.sendUnaryData<{ signed_url: string; expires_at: number }>,
  ) => void;
}>(STORAGE_PROTO_PATH, ['nexora', 'storage', 'StorageService'], gatewayEnv.storageGrpcUrl);

export const aiClient = loadGrpcClient<{
  GenerateProjectBlueprint: (
    req: { org_id: string; prompt: string; industry_hint: string },
    cb: grpc.sendUnaryData<Record<string, unknown>>,
  ) => void;
}>(AI_PROTO_PATH, ['nexora', 'ai', 'AiGovernanceService'], gatewayEnv.aiGrpcUrl);

export function grpcCall<TReq, TRes>(
  fn: (req: TReq, cb: grpc.sendUnaryData<TRes>) => void,
  req: TReq,
): Promise<TRes> {
  return new Promise((resolve, reject) => {
    fn(req, (err, res) => (err ? reject(err) : resolve(res as TRes)));
  });
}
