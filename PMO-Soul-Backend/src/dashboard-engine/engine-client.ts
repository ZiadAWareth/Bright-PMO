/**
 * Server-to-server calls to the Dashboard Engine's Connected Apps API (/api/connect/v1).
 *
 * A plain module (global fetch, no Nest) so it can be tested with a stubbed fetch.
 * Every failure becomes an EngineCallError with a code the service maps to a clear message;
 * nothing here ever logs a key, a code or a token.
 */
import { clientAssertion, type PublicJwk } from './engine-keys';

export type EngineErrorCode =
  | 'unreachable'       // network failure or timeout
  | 'disabled'          // the engine does not offer Connected Apps (404)
  | 'invalid_grant'     // the one-time code was refused
  | 'app_revoked'       // the engine disconnected this app
  | 'unauthorized'      // the engine refused this app's credentials
  | 'engine_error';     // anything else

export class EngineCallError extends Error {
  constructor(readonly code: EngineErrorCode, message: string, readonly status?: number) {
    super(message);
    this.name = 'EngineCallError';
  }
}

export interface ExchangeResult {
  clientId: string;
  kid: string;
  displayName: string;
  workspace: { id: string; name: string | null };
  workspaceCreated: boolean;
  sharedProject: { id: string; name: string } | null;
  allowedOrigins: string[];
}

export interface EngineStatus {
  clientId: string;
  displayName: string;
  workspace: { id: string; name: string | null };
  workspaceCreated: boolean;
  sharedProject: { id: string; name: string } | null;
  revoked: boolean;
}

const TIMEOUT_MS = 8000;

/** https://x.y/ + "/api/connect/v1/status" without double slashes. */
export function apiUrl(base: string, path: string): string {
  return base.replace(/\/+$/, '') + path;
}

async function call(url: string, init: RequestInit, fetchImpl: typeof fetch = fetch): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetchImpl(url, { ...init, signal: controller.signal, redirect: 'error' });
  } catch {
    throw new EngineCallError('unreachable', 'The Dashboard Engine could not be reached.');
  } finally {
    clearTimeout(timer);
  }
  const body: any = await res.json().catch(() => ({}));
  if (res.ok) return body;
  if (res.status === 404) {
    throw new EngineCallError('disabled', 'This Dashboard Engine does not accept app connections yet (CONNECTED_APPS_ENABLED is off).', 404);
  }
  const code = String(body?.error || '');
  const message = String(body?.message || 'The Dashboard Engine refused the request.');
  if (code === 'invalid_grant') throw new EngineCallError('invalid_grant', message, res.status);
  if (code === 'app_revoked') throw new EngineCallError('app_revoked', message, res.status);
  if (res.status === 401 || res.status === 403) throw new EngineCallError('unauthorized', message, res.status);
  throw new EngineCallError('engine_error', message, res.status);
}

/** Step 3 of the connect flow: trade the one-time code for this app's client ID. */
export function exchangeCode(
  engineApiUrl: string,
  input: { code: string; codeVerifier: string; redirectUri: string; publicJwk: PublicJwk },
  fetchImpl?: typeof fetch,
): Promise<ExchangeResult> {
  return call(
    apiUrl(engineApiUrl, '/api/connect/v1/token-exchange'),
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) },
    fetchImpl,
  );
}

interface Credentials {
  engineApiUrl: string;
  clientId: string;
  privateKeyPem: string;
  kid: string;
}

function signed(creds: Credentials): Record<string, string> {
  return {
    Authorization: `Bearer ${clientAssertion(creds.clientId, creds.privateKeyPem, creds.kid)}`,
    'Content-Type': 'application/json',
  };
}

export function fetchStatus(creds: Credentials, fetchImpl?: typeof fetch): Promise<EngineStatus> {
  return call(apiUrl(creds.engineApiUrl, '/api/connect/v1/status'), { method: 'GET', headers: signed(creds) }, fetchImpl);
}

export function disconnect(creds: Credentials, fetchImpl?: typeof fetch): Promise<{ disconnected: boolean }> {
  return call(apiUrl(creds.engineApiUrl, '/api/connect/v1/disconnect'), { method: 'POST', headers: signed(creds), body: '{}' }, fetchImpl);
}
