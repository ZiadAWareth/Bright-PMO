import { LandingPage } from "@/components/marketing/LandingPage";

/**
 * Application entry point — the public marketing landing page.
 *
 * This used to be an auth probe that bounced straight to `/analytics/dashboard` or
 * `/auth/login`. The root is now the public front door; sign in lives at
 * `/auth/signin`, and the middleware still guards every protected route.
 */
export default function Home() {
  return <LandingPage />;
}
