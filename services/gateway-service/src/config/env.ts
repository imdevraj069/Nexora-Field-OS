import amqplib, { Channel } from 'amqplib';
import { createShardRouterFromEnv } from '@nexora/shard-router';

export const gatewayEnv = {
  port: Number(process.env.API_GATEWAY_PORT ?? 4000),
  storageHttpUrl: process.env.STORAGE_HTTP_URL ?? 'http://storage-service:4002',
  masterStorageKey: process.env.MASTER_STORAGE_KEY ?? 'dev-master-storage-key',
  identityGrpcUrl: process.env.IDENTITY_GRPC_URL ?? 'identity-service:50051',
  storageGrpcUrl: process.env.STORAGE_GRPC_URL ?? 'storage-service:50052',
  aiGrpcUrl: process.env.AI_GRPC_URL ?? 'ai-governance-service:50053',
};

export const dataRouter = createShardRouterFromEnv();
let mqChannel: Channel | null = null;

export async function initGatewayMq(): Promise<void> {
  if (!process.env.RABBITMQ_URL) return;
  try {
    const conn = await amqplib.connect(process.env.RABBITMQ_URL);
    mqChannel = await conn.createChannel();
    await mqChannel.assertQueue('ai_jobs', { durable: true });
    await mqChannel.assertQueue('email_tasks', { durable: true });
  } catch (err) {
    console.warn('[gateway-service] RabbitMQ unavailable:', (err as Error).message);
  }
}

export function getGatewayMqChannel(): Channel | null {
  return mqChannel;
}
