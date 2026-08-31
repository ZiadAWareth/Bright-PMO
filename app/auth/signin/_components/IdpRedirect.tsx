"use client";

import { useEffect, useState } from "react";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { loginErrorMessage, safeReturnTo, DEFAULT_HOME_PATH } from "./constants";
import { Spinner } from "@/components/ui/spinner";

/**
 * IdP mode: there is no email/password UI — the browser goes straight to the
 * identity provider via `/api/auth/idp/start`. Only when SSO has failed
 * (`?error=`) do we stop and show the reason plus a retry link.
 */
export function IdpRedirect() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) {
      setError(loginErrorMessage(err));
      return;
    }
    const returnTo = safeReturnTo(params.get("returnTo"));
    window.location.replace(
      `/api/auth/idp/start?returnTo=${encodeURIComponent(returnTo)}`,
    );
  }, []);

  const retryHref = `/api/auth/idp/start?returnTo=${encodeURIComponent(DEFAULT_HOME_PATH)}`;

  if (error) {
    return (
      <AuthLayout
        heading="Sign-in failed"
        subtitle="Single sign-on could not complete."
        backHref="/"
      >
        <div className="rounded-[11px] border border-bright-danger/30 bg-bright-danger/10 px-3.5 py-3 text-[13px] text-bright-danger">
          {error}
        </div>
        <a
          href={retryHref}
          className="mt-4 flex h-11 w-full items-center justify-center rounded-[11px] bg-bright-primary text-sm font-semibold text-white shadow-sm transition-colors hover:bg-bright-primary-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-bright-primary/30"
        >
          Try again
        </a>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      heading="Redirecting…"
      subtitle="Taking you to your organisation's sign-in page."
      backHref="/"
    >
      <div className="flex items-center justify-center gap-2 py-4 text-sm text-text-secondary">
        <Spinner size={16} />
        Connecting to the identity provider
      </div>
    </AuthLayout>
  );
}
