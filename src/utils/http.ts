import { ZodIssue } from 'zod';

export type ResponseMeta = Record<string, unknown>;
export type ValidationDetail = { field: string; issue: string; rejectedValue?: unknown };

export const ok = (data: unknown, meta?: ResponseMeta) => ({ success: true, data, ...(meta ? { meta } : {}) });
export const created = (data: unknown, meta?: ResponseMeta) => ok(data, meta);
export const fail = (code: string, message: string, details?: unknown) => ({ success: false, error: { code, message, ...(details ? { details } : {}) } });

export const mapZodIssues = (issues: ZodIssue[]): ValidationDetail[] =>
  issues.map((issue) => ({
    field: issue.path.length ? issue.path.join('.') : 'body',
    issue: issue.message,
    ...(issue.code !== 'invalid_type' && 'received' in issue ? { rejectedValue: (issue as { received?: unknown }).received } : {})
  }));
