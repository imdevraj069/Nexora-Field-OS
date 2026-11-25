import amqplib, { Channel } from 'amqplib';
import { createShardRouterFromEnv } from '@nexora/shard-router';

export const envConfig = {
  httpPort: Number(process.env.IDENTITY_HTTP_PORT ?? 4001),
  grpcPort: Number(process.env.IDENTITY_GRPC_PORT ?? 50051),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
};

export const dataRouter = createShardRouterFromEnv();
let mqChannel: Channel | null = null;

export async function initRabbitMq(): Promise<void> {
  const url = process.env.RABBITMQ_URL;
  if (!url) return;
  try {
    const conn = await amqplib.connect(url);
    mqChannel = await conn.createChannel();
    await mqChannel.assertQueue('email_tasks', { durable: true });
  } catch (err) {
    console.warn('[identity-service] RabbitMQ unavailable:', (err as Error).message);
  }
}

export function publishEmailTask(payload: Record<string, unknown>): void {
  if (!mqChannel) return;
  mqChannel.sendToQueue('email_tasks', Buffer.from(JSON.stringify(payload)), { persistent: true });
}
