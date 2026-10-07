"use client";

import { useEffect } from "react";

import { Spinner } from "@/components/ui/spinner";

/**
 * Legacy sign-in route. The screen now lives at `/auth/signin`; this stays as a
 * redirect because `/auth/login` is referenced in a lot of places — the axios
 * 401 handlers, the app shell's logout, and any bookmarks users already have.
 *
 * Query params are carried across so `?error=` and `?returnTo=` still work.
 */
export default function LoginPage() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const { search, hash } = window.location;
    window.location.replace(`/auth/signin${search}${hash}`);
  }, []);

  return (
    <div className="flex h-dvh items-center justify-center bg-bg-light">
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <Spinner size={16} />
        Redirecting to sign in…
      </div>
    </div>
  );
}
