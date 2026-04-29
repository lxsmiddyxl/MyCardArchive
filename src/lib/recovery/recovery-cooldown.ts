import "server-only";

const COOLDOWN_MS = 45_000;
const lastRun = new Map<string, number>();

export function canRunRecoveryAction(name: string): boolean {
  const prev = lastRun.get(name) ?? 0;
  return Date.now() - prev >= COOLDOWN_MS;
}

export function markRecoveryRun(name: string): void {
  lastRun.set(name, Date.now());
}

export function resetRecoveryCooldownForTests(): void {
  lastRun.clear();
}
