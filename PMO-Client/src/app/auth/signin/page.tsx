"use client";

import { SignInForm } from "@/features/auth/components/signin/SignInForm";
import { IdpRedirect } from "@/features/auth/components/signin/IdpRedirect";
import { USE_IDP_AUTH } from "@/features/auth/components/signin/constants";

/**
 * Sign-in route. Thin orchestrator — the screen itself lives in
 * `_components/`, per the repo's screen-decomposition conventions.
 *
 * With `NEXT_PUBLIC_USE_IDP_AUTH=true` there is no local form: the browser is
 * handed straight to the identity provider.
 */
export default function SignInPage() {
  return USE_IDP_AUTH ? <IdpRedirect /> : <SignInForm />;
}
