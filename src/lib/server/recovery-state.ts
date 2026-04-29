import "server-only";

export type RecoveryAttemptRecord = {
  name: string;
  ts: number;
  ok: boolean;
  recovered: boolean;
  data?: unknown;
};

const MAX = 40;
const attempts: RecoveryAttemptRecord[] = [];

export function recordRecoveryAttempt(entry: Omit<RecoveryAttemptRecord, "ts"> & { ts?: number }): void {
  attempts.push({
    ...entry,
    ts: entry.ts ?? Date.now(),
  });
  if (attempts.length > MAX) attempts.splice(0, attempts.length - MAX);
}

export function getRecoveryAttempts(): readonly RecoveryAttemptRecord[] {
  return [...attempts];
}

export function clearRecoveryAttemptsForTests(): void {
  attempts.length = 0;
}
