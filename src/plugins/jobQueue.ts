import fp from 'fastify-plugin';

type NotificationChannel = 'email' | 'sms' | 'whatsapp';
export type NotificationJob = {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  message: string;
  attempts: number;
  maxAttempts: number;
  status: 'queued' | 'processing' | 'failed' | 'completed' | 'dead_letter';
  error?: string;
};

class NotificationQueue {
  private queue: NotificationJob[] = [];
  private deadLetter: NotificationJob[] = [];

  enqueue(job: Omit<NotificationJob, 'id' | 'attempts' | 'status'>) {
    const queued: NotificationJob = { ...job, id: crypto.randomUUID(), attempts: 0, status: 'queued' };
    this.queue.push(queued);
    return queued;
  }

  async processNext() {
    const next = this.queue.find((j) => j.status === 'queued');
    if (!next) return null;
    next.status = 'processing';
    next.attempts += 1;

    const failed = next.message.includes('[force-fail]');
    if (!failed) {
      next.status = 'completed';
      return next;
    }

    if (next.attempts >= next.maxAttempts) {
      next.status = 'dead_letter';
      next.error = 'Delivery failed after max retries';
      this.deadLetter.push(next);
      return next;
    }

    next.status = 'queued';
    next.error = `Retry scheduled (${next.attempts}/${next.maxAttempts})`;
    return next;
  }

  getSnapshot() {
    return { queue: this.queue, deadLetter: this.deadLetter };
  }
}

export default fp(async (fastify) => {
  fastify.decorate('notificationQueue', new NotificationQueue());
});
