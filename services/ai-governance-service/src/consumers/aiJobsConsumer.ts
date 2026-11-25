import amqplib, { ConsumeMessage } from 'amqplib';
import { AiJobPayload, AiService } from '../services/aiService';

export async function startAiJobsConsumer(): Promise<void> {
  if (!process.env.RABBITMQ_URL) return;
  try {
    const conn = await amqplib.connect(process.env.RABBITMQ_URL);
    const channel = await conn.createChannel();
    await channel.assertQueue('ai_jobs', { durable: true });
    await channel.prefetch(5);
    channel.consume('ai_jobs', async (msg: ConsumeMessage | null) => {
      if (!msg) return;
      try {
        await AiService.evaluateEvidenceJob(JSON.parse(msg.content.toString()) as AiJobPayload);
        channel.ack(msg);
      } catch (err) {
        console.error('[ai-governance-service] Failed job:', (err as Error).message);
        channel.nack(msg, false, false);
      }
    });
    console.log('[ai-governance-service] Listening on ai_jobs queue...');
  } catch (err) {
    console.warn('[ai-governance-service] RabbitMQ unavailable:', (err as Error).message);
  }
}
