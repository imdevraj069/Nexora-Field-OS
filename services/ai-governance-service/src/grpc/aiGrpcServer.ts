import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { AI_PROTO_PATH } from '@nexora/proto';
import { aiEnv } from '../config/env';
import { AiService } from '../services/aiService';

export function startAiGrpcServer(): void {
  const pkgDef = protoLoader.loadSync(AI_PROTO_PATH, { keepCase: true, longs: String, enums: String });
  const proto = grpc.loadPackageDefinition(pkgDef) as unknown as {
    nexora: { ai: { AiGovernanceService: { service: grpc.ServiceDefinition } } };
  };

  const server = new grpc.Server();
  server.addService(proto.nexora.ai.AiGovernanceService.service, {
    GenerateProjectBlueprint: async (
      call: grpc.ServerUnaryCall<{ org_id: string; prompt: string; industry_hint: string }, unknown>,
      callback: grpc.sendUnaryData<unknown>,
    ) => {
      try {
        const result = await AiService.generateBlueprint(call.request.prompt, call.request.industry_hint);
        callback(null, result);
      } catch (err) {
        callback(err as grpc.ServiceError);
      }
    },
    AnalyzeProjectProgress: async (
      call: grpc.ServerUnaryCall<{ org_id: string; project_id: string; user_id: string }, unknown>,
      callback: grpc.sendUnaryData<unknown>,
    ) => {
      try {
        const result = await AiService.analyzeProjectProgress(
          call.request.org_id,
          call.request.project_id,
          call.request.user_id,
        );
        callback(null, result);
      } catch (err) {
        callback(err as grpc.ServiceError);
      }
    },
  });

  server.bindAsync(`0.0.0.0:${aiEnv.grpcPort}`, grpc.ServerCredentials.createInsecure(), () => {
    console.log(`[ai-governance-service] gRPC listening on :${aiEnv.grpcPort}`);
  });
}
