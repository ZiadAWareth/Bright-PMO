import type { PulseExecutor } from '../../../core';

/**
 * Calls one of the app's own APIs (chosen from the OpenAPI catalog). The endpoint
 * is stored as "METHOD /path"; the body is mapped from previous steps. Goes through
 * the injected `http` service port (real in test runs too). A 2xx yields the
 * response; otherwise a catchable `ApiError`.
 */
export const execute: PulseExecutor = async (inputs, ctx) => {
  if (!ctx.services.http) {
    return { error: { name: 'HttpUnavailable', message: 'No HTTP service is configured.' } };
  }
  const raw = String(inputs.endpoint ?? '').trim();
  if (!raw) return { error: { name: 'MissingEndpoint', message: 'Call App API requires an endpoint.' } };

  const space = raw.indexOf(' ');
  const method = (space > 0 ? raw.slice(0, space) : 'GET').toUpperCase();
  const path = space > 0 ? raw.slice(space + 1).trim() : raw;
  const as = String(inputs.as ?? 'response').trim() || 'response';

  // Append query params if configured.
  let url = path;
  const query = inputs.query && typeof inputs.query === 'object' ? (inputs.query as Record<string, unknown>) : undefined;
  if (query && Object.keys(query).length) {
    const qs = Object.entries(query)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    url = path.includes('?') ? `${path}&${qs}` : `${path}?${qs}`;
  }

  const res = await ctx.services.http({ method, url, body: inputs.body, headers: {} });
  if (res.status < 200 || res.status >= 300) {
    return { error: { name: 'ApiError', message: `${method} ${path} → ${res.status}` } };
  }
  return { outputs: { status: res.status, [as]: res.data } };
};
