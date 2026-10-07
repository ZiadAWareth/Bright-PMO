/**
 * Module-scoped cache for the signed-in user.
 *
 * Every screen wraps *itself* in `DashboardLayout` rather than sitting under a
 * shared `layout.tsx`, and Next's App Router only preserves `layout.tsx` across
 * navigations. So each route change unmounts and rebuilds the whole shell —
 * which used to mean a fresh `GET /api/auth/me` and a "Loading navigation…"
 * spinner in the sidebar every single time you clicked a link.
 *
 * Caching the answer here (module scope survives remounts for the life of the
 * tab) lets the sidebar render fully populated on the first frame after a
 * navigation. The request is also de-duplicated, so two components mounting
 * together still make one call.
 */

export interface CurrentUser {
  fullName: string;
  nameAbbreviation: string;
  userRole: string | null;
}

let cached: CurrentUser | null = null;
let inFlight: Promise<CurrentUser | null> | null = null;

/** The cached user, or null if it has not been fetched yet this session. */
export function getCachedUser(): CurrentUser | null {
  return cached;
}

export function setCachedUser(user: CurrentUser | null) {
  cached = user;
}

/** Drop the cache — call on sign-out so the next session re-fetches. */
export function clearCachedUser() {
  cached = null;
  inFlight = null;
}

/**
 * Runs `fetcher` at most once concurrently and caches the result.
 * Subsequent callers while a request is in flight await the same promise.
 */
export function fetchCurrentUserOnce(
  fetcher: () => Promise<CurrentUser | null>,
): Promise<CurrentUser | null> {
  if (cached) return Promise.resolve(cached);
  if (inFlight) return inFlight;

  inFlight = fetcher()
    .then((user) => {
      if (user) cached = user;
      return user;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
