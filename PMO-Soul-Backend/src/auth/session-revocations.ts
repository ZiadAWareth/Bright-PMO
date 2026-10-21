/** userId -> tokens issued before this second (Unix seconds) are no longer accepted. */
const revokedBefore = new Map<number, number>();

/** Seconds, not milliseconds: a JWT's iat is whole seconds. */
const toSeconds = (at: Date) => Math.floor(at.getTime() / 1000);

/** Every session this person had before the given moment ends. A token issued in that same second survives. */
export function revokeSessionsBefore(userId: number, at: Date): void {
  if (!Number.isFinite(userId)) return;
  revokedBefore.set(Number(userId), toSeconds(at));
}

/** Startup: the rows of AuthSessionRevocation. */
export function loadRevocations(rows: ReadonlyArray<{ userId: number; revokedBefore: Date | string }>): void {
  for (const row of rows) revokeSessionsBefore(Number(row.userId), new Date(row.revokedBefore));
}

/** Was this token issued before its user's sessions were ended? */
export function isRevoked(userId: unknown, issuedAtSeconds: unknown): boolean {
  const cutoff = revokedBefore.get(Number(userId));
  if (cutoff === undefined) return false;
  const iat = Number(issuedAtSeconds);
  return !Number.isFinite(iat) || iat < cutoff;
}

/** The sentence a signed-out session hears. */
export const SESSION_REVOKED_MESSAGE = 'Your session ended because your password was changed. Sign in again.';
