/**
 * How people prove who they are in this app.
 *
 * An administrator picks one of three states on the Sign-in page: passwords only, one-time codes
 * only, or both. Stored as a comma-separated string in AuthSetting.methods, parsed here, and
 * published to a UI builder as contract.auth.methods so a sign-in screen can be designed against
 * it rather than guessed at.
 */

/** Every method this generator can serve. Anything else in the row is ignored, never guessed at. */
export const AUTH_METHODS = ['password', 'otp'] as const;

export type AuthMethod = (typeof AUTH_METHODS)[number];

/**
 * What an app offers when nothing has been chosen — and what it falls back to when the row cannot
 * be read at all.
 *
 * Password, deliberately. A one-time code needs a working mail transport, and an app whose SMTP is
 * not configured yet would otherwise have a front door nobody, including its own administrator,
 * could walk through.
 */
export const DEFAULT_AUTH_METHODS: readonly AuthMethod[] = ['password'];

/**
 * The stored string as a list of methods.
 *
 * Unknown entries are DROPPED rather than defaulted to something: a row saying "magic-link" must
 * not silently become a password login. An empty result falls back to the default, because an app
 * offering no way in at all is never what anybody configured on purpose.
 */
export function parseAuthMethods(raw: unknown): AuthMethod[] {
  const wanted = new Set(
    String(raw == null ? '' : raw)
      .split(/[,\s]+/)
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean),
  );
  // Iterated over AUTH_METHODS, not over the input, so the order is canonical however the row was
  // written: a consumer diffing contract.auth.methods must not see a change because somebody saved
  // "otp,password" instead of "password,otp".
  const methods = AUTH_METHODS.filter((method) => wanted.has(method));
  return methods.length ? [...methods] : [...DEFAULT_AUTH_METHODS];
}

/** How a chosen list is written back to the row. */
export function serialiseAuthMethods(methods: readonly string[]): string {
  return parseAuthMethods(methods.join(',')).join(',');
}

export function offersPassword(methods: readonly string[]): boolean {
  return methods.includes('password');
}

export function offersOtp(methods: readonly string[]): boolean {
  return methods.includes('otp');
}

export type AuthMethodsCheck =
  | { ok: true; value: AuthMethod[] }
  | { ok: false; message: string };

/**
 * Validate what the Sign-in page sent.
 *
 * Refuses an unknown method BY NAME instead of quietly dropping it — an administrator who typed
 * "magic" must learn that this app has no such method, not save a form and wonder why nothing
 * changed. Refuses an empty list for the same reason: it would lock everybody out.
 */
export function validateAuthMethods(body: unknown): AuthMethodsCheck {
  const raw = (body as { methods?: unknown } | null)?.methods;
  const list = Array.isArray(raw)
    ? raw.map((m) => String(m ?? '').trim().toLowerCase())
    : String(raw == null ? '' : raw)
        .split(/[,\s]+/)
        .map((m) => m.trim().toLowerCase())
        .filter(Boolean);

  if (!list.length) {
    return { ok: false, message: 'Choose at least one way for people to sign in.' };
  }
  const unknown = list.filter((m) => !(AUTH_METHODS as readonly string[]).includes(m));
  if (unknown.length) {
    return {
      ok: false,
      message:
        'This app has no sign-in method called ' +
        unknown.sort().join(', ') +
        '. Choose from: ' +
        AUTH_METHODS.join(', ') +
        '.',
    };
  }
  return { ok: true, value: parseAuthMethods(list.join(',')) };
}
