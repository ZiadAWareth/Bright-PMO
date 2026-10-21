/**
 * SSRF guard for outbound pulses (G6).
 *
 * A workflow author — or the AI agent — can bind an outbound URL to anything.
 * Without validation `integration.httpRequest` will happily fetch
 * http://169.254.169.254/ (cloud metadata), http://localhost:5432 (the database),
 * file:///etc/passwd, or any internal admin endpoint. That is a server-side
 * request forgery with a direct path to credential theft.
 *
 * Lives in core/ rather than in one pulse so every outbound pulse validates the
 * same way and none can quietly skip it.
 *
 * Operators — not workflow authors — may allow specific internal hosts via
 * WORKFLOW_INTEGRATION_ALLOWED_HOSTS (comma-separated). It is an environment
 * setting on purpose: the restriction must not be liftable from inside the
 * designer by the same person who could abuse it.
 *
 * Known limitation: this validates the hostname as written. A public name that
 * resolves to a private address (DNS rebinding) is not caught here — that needs
 * resolve-then-pin at the socket layer.
 */

const ALLOWED_SCHEMES = new Set(['http:', 'https:']);
const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

export class BlockedUrlError extends Error {
  readonly name = 'BlockedUrl';
}

function allowedHosts(): Set<string> {
  const raw =
    typeof process !== 'undefined'
      ? process.env?.WORKFLOW_INTEGRATION_ALLOWED_HOSTS
      : undefined;
  return new Set(
    (raw || '')
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Throws BlockedUrlError unless the URL is a public http(s) target. */
export function assertPublicUrl(urlString: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new BlockedUrlError(`Invalid URL "${urlString}".`);
  }

  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    throw new BlockedUrlError(`Blocked scheme "${parsed.protocol}" — only http and https are allowed.`);
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (allowedHosts().has(host)) return parsed;

  if (BLOCKED_HOSTS.has(host)) {
    throw new BlockedUrlError(`Blocked host "${parsed.hostname}".`);
  }

  // IPv4 loopback / private / link-local (169.254.169.254 is cloud metadata).
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    const isPrivate =
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254);
    if (isPrivate) {
      throw new BlockedUrlError(`Blocked private address "${parsed.hostname}".`);
    }
  }

  // IPv6 loopback (::1), unique-local (fc00::/7), link-local (fe80::/10).
  if (host === '::1' || /^f[cd]/.test(host) || /^fe[89ab]/.test(host)) {
    throw new BlockedUrlError(`Blocked private address "${parsed.hostname}".`);
  }

  return parsed;
}
