import { createShardRouterFromEnv } from '@nexora/shard-router';

export const aiEnv = {
  grpcPort: Number(process.env.AI_GRPC_PORT ?? 50053),
  storageHttpUrl: process.env.STORAGE_HTTP_URL ?? 'http://storage-service:4002',
  masterReadKey: process.env.MASTER_READ_KEY ?? 'dev-master-read-key',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
};

export const dataRouter = createShardRouterFromEnv();
