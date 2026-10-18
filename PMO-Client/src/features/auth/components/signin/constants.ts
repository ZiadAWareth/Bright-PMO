/** Human-readable copy for the `?error=` codes the IdP callback can return. */
const IDP_ERROR_MESSAGES: Record<string, string> = {
  idp_disabled: "Single sign-on is not enabled.",
  idp_misconfigured:
    "Single sign-on is not configured correctly. Check server environment variables.",
  idp_authorize_denied: "Sign-in was cancelled.",
  missing_code: "Authorization code missing. Try signing in again.",
  missing_state:
    "Sign-in session expired or incomplete (missing state). Try again.",
  invalid_state: "Invalid sign-in session. Try again.",
  missing_pkce: "Sign-in session expired. Try again.",
  invalid_return_to: "Invalid redirect.",
  token_exchange_failed:
    "Could not complete sign-in with the identity provider.",
  invalid_token_response: "Invalid response from identity provider.",
  identity_failed: "Could not read your profile from the identity provider.",
  user_not_found: "No account found for this user. Contact your administrator.",
  user_mapping_failed: "Could not link your account.",
  session_failed: "Could not create a session.",
  authentication_required: "Please sign in to continue.",
};

export function loginErrorMessage(code: string): string {
  return IDP_ERROR_MESSAGES[code] || "Sign-in failed.";
}

/** Whether the app is configured to delegate sign-in to the identity provider. */
export const USE_IDP_AUTH =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_IDP_AUTH === "true";

/** Only same-origin, non-protocol-relative paths are safe to bounce back to. */
export function safeReturnTo(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/analytics/dashboard";
  return raw;
}

export const DEFAULT_HOME_PATH = "/analytics/dashboard";
