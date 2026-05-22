export const ok = (data: unknown, meta?: Record<string, unknown>) => ({ success: true, data, ...(meta ? { meta } : {}) });
export const err = (code: string, message: string, details?: unknown) => ({ success: false, error: { code, message, ...(details ? { details } : {}) } });
