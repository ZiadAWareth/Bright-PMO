import { assertPublicUrl, BlockedUrlError, type PulseExecutor } from '../../../core';

/**
 * Performs an outbound HTTP request through the injected `http` service port
 * (keeps the executor free of a concrete client and unit-testable). A 2xx status
 * yields the response; any other status yields a catchable `HttpError`. Templates
 * in url/headers/body are resolved by the wrapper first.
 */
export const execute: PulseExecutor = async (inputs, ctx) => {
  if (!ctx.services.http) {
    return { error: { name: 'HttpUnavailable', message: 'No HTTP service is configured.' } };
  }
  const url = String(inputs.url ?? '').trim();
  if (!url) return { error: { name: 'MissingUrl', message: 'HTTP Request requires a URL.' } };

  // G6 — validate the target BEFORE any outbound call. A bound URL can point at
  // the database, the cloud metadata endpoint or an internal admin service.
  try {
    assertPublicUrl(url);
  } catch (err) {
    if (err instanceof BlockedUrlError) {
      return { error: { name: 'BlockedUrl', message: err.message } };
    }
    throw err;
  }

  const method = String(inputs.method ?? 'GET').toUpperCase();
  const headers = inputs.headers && typeof inputs.headers === 'object' ? (inputs.headers as Record<string, string>) : undefined;
  const as = String(inputs.as ?? 'response').trim() || 'response';

  const res = await ctx.services.http({ method, url, headers, body: inputs.body });
  if (res.status < 200 || res.status >= 300) {
    // The server's answer travels with the error: Test step shows it in Output, and an error
    // branch can read it ({{response.message}}) — "401" alone does not say what to fix.
    const said = res.data && typeof res.data === 'object' ? (res.data as any).message : res.data;
    const reason = Array.isArray(said) ? said.join(', ') : typeof said === 'string' ? said : '';
    return {
      outputs: { status: res.status, [as]: res.data },
      error: { name: 'HttpError', message: `HTTP ${res.status} from ${url}` + (reason ? ` — ${reason.slice(0, 200)}` : '') },
    };
  }
  return { outputs: { status: res.status, [as]: res.data } };
};
