export const QUEUE_NAMES = {
  EMAIL: 'sem-queue-email',
  AUDIT: 'sem-queue-audit',
  MAINTENANCE: 'sem-queue-maintenance',
} as const;

export const EMAIL_QUEUE = Symbol('EMAIL_QUEUE');
export const AUDIT_QUEUE = Symbol('AUDIT_QUEUE');
export const MAINTENANCE_QUEUE = Symbol('MAINTENANCE_QUEUE');
