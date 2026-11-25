import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { STORAGE_PROTO_PATH } from '@nexora/proto';
import { storageEnv } from '../config/s3';
import { signClientReadToken } from '../services/s3Service';

export function startStorageGrpcServer(): void {
  const pkgDef = protoLoader.loadSync(STORAGE_PROTO_PATH, { keepCase: true, longs: String, enums: String });
  const proto = grpc.loadPackageDefinition(pkgDef) as unknown as {
    nexora: { storage: { StorageService: { service: grpc.ServiceDefinition } } };
  };

  const server = new grpc.Server();
  server.addService(proto.nexora.storage.StorageService.service, {
    MintSignedClientUrl: (
      call: grpc.ServerUnaryCall<
        { file_id: string; org_id: string; project_id: string; user_id: string; ttl_seconds?: number },
        unknown
      >,
      callback: grpc.sendUnaryData<unknown>,
    ) => {
      const ttl = call.request.ttl_seconds || 600;
      const exp = Math.floor(Date.now() / 1000) + ttl;
      const sig = signClientReadToken(call.request.file_id, call.request.project_id, call.request.user_id, exp);
      callback(null, {
        signed_url: `/api/v1/storage/files/${call.request.file_id}?orgId=${call.request.org_id}&projectId=${call.request.project_id}&userId=${call.request.user_id}&exp=${exp}&sig=${sig}`,
        expires_at: exp,
      });
    },
  });

  server.bindAsync(`0.0.0.0:${storageEnv.grpcPort}`, grpc.ServerCredentials.createInsecure(), () => {
    console.log(`[storage-service] gRPC listening on :${storageEnv.grpcPort}`);
  });
}
