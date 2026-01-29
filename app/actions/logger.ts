'use server';

type LogLevel = 'info' | 'warn' | 'error';

export async function logAction(event: string, meta: Record<string, unknown> = {}, level: LogLevel = 'info') {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...meta,
  };

  // Emit structured JSON to stdout (dev servers and systemd/journalctl will both capture it).
  // Use console[level] when available to keep severity metadata.
  const serialized = JSON.stringify(entry);
  if (level === 'warn' && console.warn) {
    console.warn(serialized);
  } else if (level === 'error' && console.error) {
    console.error(serialized);
  } else {
    console.log(serialized);
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
