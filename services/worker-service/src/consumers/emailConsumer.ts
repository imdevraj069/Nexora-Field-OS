import amqplib, { ConsumeMessage } from 'amqplib';
import { sendTemplatedMail } from '../lib/mailer';

export async function startEmailConsumer(): Promise<void> {
  const rabbitUrl = process.env.RABBITMQ_URL ?? 'amqp://nexora_mq:nexora_mq_pass@rabbitmq:5672';
  const conn = await amqplib.connect(rabbitUrl);
  const channel = await conn.createChannel();

  await channel.assertQueue('email_tasks.dlq', { durable: true });
  await channel.assertQueue('email_tasks.retry', {
    durable: true,
    arguments: {
      'x-message-ttl': 30_000,
      'x-dead-letter-exchange': '',
      'x-dead-letter-routing-key': 'email_tasks',
    },
  });
  await channel.assertQueue('email_tasks', { durable: true });
  await channel.prefetch(10);

  console.log('[worker-service] Listening on email_tasks queue...');

  channel.consume('email_tasks', async (msg: ConsumeMessage | null) => {
    if (!msg) return;
    const retries = Number(msg.properties.headers?.['x-retry-count'] ?? 0);

    try {
      const payload = JSON.parse(msg.content.toString());
      await sendTemplatedMail(payload);
      channel.ack(msg);
    } catch (err) {
      console.error('[worker-service] Failed email task:', (err as Error).message);
      channel.ack(msg);
      if (retries < 3) {
        channel.sendToQueue('email_tasks.retry', msg.content, {
          persistent: true,
          headers: { 'x-retry-count': retries + 1 },
        });
      } else {
        channel.sendToQueue('email_tasks.dlq', msg.content, { persistent: true });
      }
    }
  });
}
