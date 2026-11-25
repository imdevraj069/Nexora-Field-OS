import amqplib, { ConsumeMessage } from 'amqplib';
import Handlebars from 'handlebars';
import nodemailer from 'nodemailer';

interface EmailTaskPayload {
  template: string;
  to: string;
  subject: string;
  data: Record<string, unknown>;
}

const TEMPLATES: Record<string, string> = {
  'verify-email': `
    <h2>Welcome to Nexora Field OS, {{fullName}}</h2>
    <p>Your verification code is: <strong>{{verifyOtp}}</strong></p>
    {{#if orgId}}<p>Your Organization ID: <code>{{orgId}}</code></p>{{/if}}
  `,
  'password-reset': `
    <h2>Password Reset Request</h2>
    <p>Use this reset token within 30 minutes: <code>{{resetToken}}</code></p>
  `,
  'cross-org-project-invite': `
    <h2>Project Collaboration Invitation</h2>
    <p>You have been invited by <strong>{{ownerOrgId}}</strong> to collaborate on project <strong>{{projectTitle}}</strong> ({{projectId}}) as <strong>{{roleName}}</strong>.</p>
  `,
  'task-assigned': `
    <h2>New Field Task Assigned</h2>
    <p>Task: <strong>{{taskTitle}}</strong> (Stage: {{stageName}})</p>
    <p>Deadline: {{deadline}}</p>
  `,
  'stage-verified': `
    <h2>Stage Update: {{projectTitle}}</h2>
    <p>Stage <strong>{{stageName}}</strong> status changed to <strong>{{status}}</strong>.</p>
  `,
};

const compiledTemplates = Object.fromEntries(
  Object.entries(TEMPLATES).map(([name, src]) => [name, Handlebars.compile(src)]),
);

function createMailer() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_SMTP_USER,
      pass: process.env.GMAIL_SMTP_APP_PASSWORD,
    },
  });
}

async function startWorker() {
  const rabbitUrl = process.env.RABBITMQ_URL ?? 'amqp://nexora_mq:nexora_mq_pass@rabbitmq:5672';
  const conn = await amqplib.connect(rabbitUrl);
  const channel = await conn.createChannel();

  // Assert main queue, dead-letter queue, and 30s retry queue
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

  const mailer = createMailer();
  const fromAddress = `"${process.env.MAIL_FROM_NAME ?? 'Nexora Field OS'}" <${process.env.GMAIL_SMTP_USER}>`;

  console.log('[worker] Listening on email_tasks queue...');

  channel.consume('email_tasks', async (msg: ConsumeMessage | null) => {
    if (!msg) return;
    const retries = Number(msg.properties.headers?.['x-retry-count'] ?? 0);

    try {
      const payload = JSON.parse(msg.content.toString()) as EmailTaskPayload;
      const render = compiledTemplates[payload.template];
      const html = render
        ? render(payload.data)
        : `<p>${JSON.stringify(payload.data)}</p>`;

      if (!process.env.GMAIL_SMTP_USER || !process.env.GMAIL_SMTP_APP_PASSWORD) {
        console.log(`[worker] (dry-run SMTP) To: ${payload.to} | Subject: ${payload.subject}`);
      } else {
        await mailer.sendMail({
          from: fromAddress,
          to: payload.to,
          subject: payload.subject,
          html,
        });
      }
      channel.ack(msg);
    } catch (err) {
      console.error('[worker] Failed email task:', (err as Error).message);
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

startWorker().catch((err) => {
  console.error('[worker] Fatal startup error:', err);
  process.exit(1);
});
