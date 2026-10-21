/**
 * The keys and one-time values behind this app's connection to the Dashboard Engine.
 *
 * A plain module (Node's crypto only, no Nest) so it can be tested on its own.
 *
 * WHY A KEY PAIR AND NOT A SHARED SECRET
 * The app generates an ES256 (P-256) key pair when its administrator clicks Connect. Only the PUBLIC
 * half is sent to the engine. The app proves who it is by signing a short-lived "client assertion"
 * (RFC 7523) with its private key, which never leaves this app's database, encrypted. A leak of the
 * engine's database therefore gives an attacker nothing they can use to act as this app.
 */
import { createHash, generateKeyPairSync, randomBytes, randomUUID, sign, createPrivateKey, createPublicKey } from 'crypto';

/** Must match ASSERTION_AUDIENCE in the engine (app/connect_crypto.py). */
export const ASSERTION_AUDIENCE = 'dashboard-engine:connect';
/** Kept well under the engine's 120 s ceiling. */
export const ASSERTION_LIFETIME_SECONDS = 60;

export interface PublicJwk {
  kty: 'EC';
  crv: 'P-256';
  x: string;
  y: string;
}

export interface AppKeyPair {
  privateKeyPem: string;
  publicJwk: PublicJwk;
  /** RFC 7638 thumbprint of the public key: the key ID the engine knows it by. */
  kid: string;
}

export const b64url = (data: Buffer | string): string =>
  Buffer.from(data).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

export function jwkThumbprint(jwk: PublicJwk): string {
  const canonical = JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y });
  return b64url(createHash('sha256').update(canonical).digest());
}

export function generateAppKeyPair(): AppKeyPair {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = publicKey.export({ format: 'jwk' }) as any;
  const publicJwk: PublicJwk = { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y };
  return {
    privateKeyPem: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
    publicJwk,
    kid: jwkThumbprint(publicJwk),
  };
}

/** The public half of a stored private key (to re-derive the kid without storing it twice). */
export function publicJwkOf(privateKeyPem: string): PublicJwk {
  const jwk = createPublicKey(createPrivateKey(privateKeyPem)).export({ format: 'jwk' }) as any;
  return { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y };
}

/** A compact JWS signed ES256 (signature in the JOSE r||s form, not DER). */
export function signEs256(claims: Record<string, unknown>, privateKeyPem: string, kid: string): string {
  const header = b64url(JSON.stringify({ alg: 'ES256', kid, typ: 'JWT' }));
  const body = b64url(JSON.stringify(claims));
  const signature = sign('sha256', Buffer.from(`${header}.${body}`), {
    key: privateKeyPem,
    dsaEncoding: 'ieee-p1363',
  });
  return `${header}.${body}.${b64url(signature)}`;
}

/** A single-use, 60-second proof that this call comes from this app (RFC 7523 client assertion). */
export function clientAssertion(clientId: string, privateKeyPem: string, kid: string, nowSeconds = Math.floor(Date.now() / 1000)): string {
  return signEs256(
    {
      iss: clientId,
      sub: clientId,
      aud: ASSERTION_AUDIENCE,
      iat: nowSeconds,
      exp: nowSeconds + ASSERTION_LIFETIME_SECONDS,
      jti: randomUUID(),
    },
    privateKeyPem,
    kid,
  );
}

/** RFC 7636 PKCE pair (S256). The verifier stays on this server; only the challenge travels. */
export function pkcePair(): { verifier: string; challenge: string } {
  const verifier = b64url(randomBytes(32)); // 43 characters
  return { verifier, challenge: b64url(createHash('sha256').update(verifier).digest()) };
}

/** An unguessable value that ties the engine's answer to the request this app sent. */
export function newState(): string {
  return b64url(randomBytes(24));
}
