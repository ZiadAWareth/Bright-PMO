"use client";

import { SignInForm } from "./_components/SignInForm";
import { IdpRedirect } from "./_components/IdpRedirect";
import { USE_IDP_AUTH } from "./_components/constants";

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
