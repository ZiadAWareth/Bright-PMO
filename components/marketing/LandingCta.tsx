import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Closing call-to-action band. */
export function LandingCta() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
      <div className="reveal-on-scroll relative overflow-hidden rounded-3xl bg-bright-primary px-6 py-16 text-center shadow-xl sm:px-12">
        {/* Decorative glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 30% 0%, rgba(255,255,255,0.18), transparent 60%)",
          }}
        />
        <div className="relative">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to bring every project under one plan?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-balance text-base/relaxed text-white/85">
            Sign in to your PMO workspace and pick up exactly where your team
            left off.
          </p>
          <div className="mt-8 flex justify-center">
            {/* The band is the brand colour in both themes, so this pill stays
                white on purpose. Uses an arbitrary value rather than `bg-surface`
                so no dark-mode surface rule can rewrite it. */}
            <Link
              href="/auth/signin"
              className="group inline-flex h-11 items-center gap-2 rounded-xl bg-on-brand px-8 text-[0.95rem] font-semibold text-bright-primary shadow-lg transition-colors hover:bg-on-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bright-primary"
            >
              Go to sign in
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
