"use client";

import { SignInForm } from "@/features/auth/components/signin/SignInForm";

/**
 * Sign-in route. Thin orchestrator — the screen itself lives in
 * `features/auth/components/signin/`, per the repo's screen-decomposition
 * conventions. UI only until the backend integration.
 */
export default function SignInPage() {
  return <SignInForm />;
}
