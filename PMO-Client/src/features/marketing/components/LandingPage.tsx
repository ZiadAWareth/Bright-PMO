import { LandingNav } from "./LandingNav";
import { LandingHero } from "./LandingHero";
import { LandingStats } from "./LandingStats";
import { LandingFeatures } from "./LandingFeatures";
import { LandingHowItWorks } from "./LandingHowItWorks";
import { LandingPlatform } from "./LandingPlatform";
import { LandingCta } from "./LandingCta";
import { LandingFooter } from "./LandingFooter";
import { RevealOnScroll } from "./RevealOnScroll";

/**
 * Public marketing landing page — the app's entry screen at `/`.
 * Composition only.
 *
 * The outer element is a real scroll container (`h-dvh overflow-y-auto`) rather
 * than letting the document scroll, and that is load-bearing. `overflow-x:
 * hidden` on its own would still make this element a scrollport — just one that
 * never scrolls — which leaves anything resolving against it (the section
 * reveals, the nav's `position: sticky`) permanently stuck at its start state.
 * `data-reveal-root` hands the same element to RevealOnScroll as its
 * IntersectionObserver root.
 */
export function LandingPage() {
  return (
    <div
      data-reveal-root
      className="h-dvh overflow-y-auto overflow-x-hidden bg-bg-light text-text-primary"
    >
      <RevealOnScroll />
      <div className="flex min-h-full flex-col">
        <LandingNav />
        <main className="flex-1">
          <LandingHero />
          <LandingStats />
          <LandingFeatures />
          <LandingHowItWorks />
          <LandingPlatform />
          <LandingCta />
        </main>
        <LandingFooter />
      </div>
    </div>
  );
}
