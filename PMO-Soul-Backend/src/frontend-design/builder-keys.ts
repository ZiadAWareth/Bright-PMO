import { createHash, randomBytes } from 'crypto';

/** Recognisable in a leak scan, long enough that guessing is hopeless. */
export const BUILDER_KEY_PREFIX = 'sbk_';

export function newBuilderKey(): string {
  return BUILDER_KEY_PREFIX + randomBytes(32).toString('base64url');
}

/** The stored form. A key that is not ours (wrong prefix) never reaches the database. */
export function hashBuilderKey(key: string): string | null {
  const text = String(key || '').trim();
  if (!text.startsWith(BUILDER_KEY_PREFIX) || text.length < 40) return null;
  return createHash('sha256').update(text).digest('hex');
}
