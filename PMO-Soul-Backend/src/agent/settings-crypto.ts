import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

/** Bumped only if the wire format below changes; `decryptSecret` refuses anything else. */
const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
/** 96 bits — the IV length AES-GCM is specified and optimised for. */
const IV_BYTES = 12;
const KEY_BYTES = 32;

/**
 * Fixed, non-secret salt and label. HKDF's salt does not need to be secret; its
 * job is domain separation, so that this derived key can never collide with
 * another key derived from the same app secret for a different purpose.
 */
const SALT = 'soul.agent.settings.v1';
const INFO = 'agent-provider-api-key';

/**
 * HKDF rather than scrypt/argon2 on purpose.
 *
 * Those are password stretchers — deliberately slow, to make guessing a
 * human-chosen phrase expensive. The input here is the app's JWT_SECRET: 64
 * random bytes generated at project creation. There is nothing to guess and
 * nothing to stretch, so slowness would buy no security and would be paid on
 * every settings read.
 */
function deriveKey(appSecret: string): Buffer {
  return Buffer.from(hkdfSync('sha256', appSecret, SALT, INFO, KEY_BYTES));
}

export class MissingAppSecretError extends Error {
  readonly code = 'MissingAppSecret';
  constructor() {
    super('Cannot store a provider key: this app has no JWT_SECRET to encrypt it with.');
    this.name = 'MissingAppSecretError';
  }
}

/**
 * Returns `v1.<iv>.<tag>.<ciphertext>`, each part base64.
 *
 * A dot is a safe delimiter because base64 never produces one.
 *
 * Throws when there is no app secret. Refusing is the point: the alternative is
 * silently writing an unencrypted key into a column named `apiKeyCipher`, which
 * would be worse than the failure.
 */
export function encryptSecret(plaintext: string, appSecret: string): string {
  if (!appSecret) throw new MissingAppSecretError();

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, deriveKey(appSecret), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

  return [
    VERSION,
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    ciphertext.toString('base64'),
  ].join('.');
}

/**
 * Returns null rather than throwing when the payload cannot be read.
 *
 * The realistic cause is a rotated JWT_SECRET, and the right behaviour then is
 * for the app to report itself as not configured and ask for the key again —
 * not to fail every request that touches settings. GCM's auth tag means a
 * tampered or truncated value lands in the same branch, which is also correct.
 */
export function decryptSecret(payload: string | null | undefined, appSecret: string): string | null {
  if (!payload || !appSecret) return null;

  const parts = payload.split('.');
  if (parts.length !== 4 || parts[0] !== VERSION) return null;

  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      deriveKey(appSecret),
      Buffer.from(parts[1], 'base64'),
    );
    decipher.setAuthTag(Buffer.from(parts[2], 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(parts[3], 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}

/**
 * The only part of a key that ever leaves the server.
 *
 * Short keys reveal proportionally more, so anything under 8 characters gets no
 * hint at all — it is not a real provider key anyway.
 */
export function last4(value: string): string {
  return value.length >= 8 ? value.slice(-4) : '';
}
