import Handlebars from 'handlebars';
import nodemailer from 'nodemailer';

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
};

const compiledTemplates = Object.fromEntries(
  Object.entries(TEMPLATES).map(([name, src]) => [name, Handlebars.compile(src)]),
);

const mailer = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_SMTP_USER,
    pass: process.env.GMAIL_SMTP_APP_PASSWORD,
  },
});

export async function sendTemplatedMail(payload: {
  template: string;
  to: string;
  subject: string;
  data: Record<string, unknown>;
}): Promise<void> {
  const render = compiledTemplates[payload.template];
  const html = render ? render(payload.data) : `<p>${JSON.stringify(payload.data)}</p>`;

  if (!process.env.GMAIL_SMTP_USER || !process.env.GMAIL_SMTP_APP_PASSWORD) {
    console.log(`[worker-service] (dry-run SMTP) To: ${payload.to} | Subject: ${payload.subject} | Data: ${JSON.stringify(payload.data)}`);
    return;
  }

  await mailer.sendMail({
    from: `"${process.env.MAIL_FROM_NAME ?? 'Nexora Field OS'}" <${process.env.GMAIL_SMTP_USER}>`,
    to: payload.to,
    subject: payload.subject,
    html,
  });
}
