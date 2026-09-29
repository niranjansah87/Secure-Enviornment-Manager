import { Worker, Job } from 'bullmq';
import type { Redis } from 'ioredis';
import type { Logger } from 'pino';
import nodemailer from 'nodemailer';

// tempPassword is intentionally absent: the API returns it directly to the
// caller; it must never travel through Redis/BullMQ as a job payload.
export interface SendWelcomeEmailJob {
  to: string;
  username: string;
}

// resetLink is the full password-reset URL (token embedded). Putting a
// short-lived URL in Redis is acceptable; a raw reusable credential is not.
export interface SendPasswordResetEmailJob {
  to: string;
  username: string;
  resetLink: string;
}

export class EmailWorker {
  private readonly worker: Worker;
  private readonly transporter: nodemailer.Transporter;

  constructor(redis: Redis, private readonly logger: Logger) {
    this.transporter = nodemailer.createTransport({
      host: process.env['SMTP_HOST'] ?? 'localhost',
      port: parseInt(process.env['SMTP_PORT'] ?? '587', 10),
      secure: process.env['SMTP_SECURE'] === 'true',
      auth: process.env['SMTP_USER']
        ? { user: process.env['SMTP_USER'], pass: process.env['SMTP_PASS'] }
        : undefined,
    });

    this.worker = new Worker(
      'sem:queue:email',
      async (job: Job) => this.process(job),
      {
        connection: redis,
        concurrency: 3,
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error({ jobId: job?.id, name: job?.name, err }, 'Email job failed');
    });
  }

  private async process(job: Job): Promise<void> {
    const from = process.env['SMTP_FROM'] ?? 'noreply@sem.local';

    if (job.name === 'send-welcome') {
      const data = job.data as SendWelcomeEmailJob;
      await this.transporter.sendMail({
        from,
        to: data.to,
        subject: 'Welcome to SEM — Your account is ready',
        text: `Welcome ${data.username}! Your account has been created. Ask your administrator for your temporary password and change it on first login.`,
        html: `<p>Welcome <strong>${data.username}</strong>!</p><p>Your account has been created. Ask your administrator for your temporary password and change it on first login.</p>`,
      });
      this.logger.info({ to: data.to }, 'Welcome email sent');
      return;
    }

    if (job.name === 'send-password-reset') {
      const data = job.data as SendPasswordResetEmailJob;
      await this.transporter.sendMail({
        from,
        to: data.to,
        subject: 'SEM — Password reset request',
        text: `Password reset link for ${data.username}:\n\n${data.resetLink}\n\nThis link expires in 1 hour.`,
        html: `<p>Password reset link for <strong>${data.username}</strong>:</p><p><a href="${data.resetLink}">${data.resetLink}</a></p><p>This link expires in 1 hour.</p>`,
      });
      this.logger.info({ to: data.to }, 'Password reset email sent');
      return;
    }

    this.logger.warn({ name: job.name }, 'Unknown email job type');
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
