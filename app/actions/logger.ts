'use server';

import fs from 'fs/promises';
import path from 'path';

const LOG_DIR =
  process.env.LIVEOS_LOG_DIR ||
  (process.env.LIVEOS_HOME ? path.join(process.env.LIVEOS_HOME, 'logs') : path.join('/tmp', 'liveos-logs'));
const LOG_FILE = path.join(LOG_DIR, 'actions.log');

type LogLevel = 'info' | 'warn' | 'error';

export async function logAction(event: string, meta: Record<string, unknown> = {}, level: LogLevel = 'info') {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    const entry = {
      ts: new Date().toISOString(),
      level,
      event,
      ...meta,
    };
    await fs.appendFile(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
  } catch (error) {
    // Best-effort logger; fall back to console
    console.error('[logger] Failed to write log entry:', (error as Error)?.message);
  }
}

export async function withActionLogging<T>(
  event: string,
  fn: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  await logAction(`${event}:start`);
  try {
    const result = await fn();
    await logAction(`${event}:success`, { durationMs: Date.now() - startedAt });
    return result;
  } catch (error) {
    await logAction(`${event}:error`, {
      durationMs: Date.now() - startedAt,
      message: (error as Error)?.message || 'unknown',
    }, 'error');
    throw error;
  }
}
