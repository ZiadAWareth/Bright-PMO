/**
 * Base URL for API calls.
 *
 * In the browser this is always empty, i.e. same origin as the page. The app
 * and its API are the same Next.js deployment, so a relative URL is always
 * correct — and pointing the browser at an absolute host (as
 * `NEXT_PUBLIC_API_URL` does when it holds a deployed URL) turns every call
 * into a cross-origin request that fails CORS preflight during local dev.
 *
 * On the server there is no origin to be relative to, so the configured URL is
 * used when one is present.
 *
 * Mirrors the pattern already used by the `useEmployees`/`useDepartments` hooks.
 */
export const apiBaseUrl =
  typeof window !== "undefined" ? "" : process.env.NEXT_PUBLIC_API_URL || "";
