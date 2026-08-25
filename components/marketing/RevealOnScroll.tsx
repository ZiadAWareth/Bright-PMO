"use client";

import { useEffect } from "react";

/**
 * Drives the landing page's `.reveal-on-scroll` sections.
 *
 * Renders nothing. On mount it marks whatever is already on screen as revealed,
 * switches the document into `js-reveal` mode (which is what actually hides the
 * rest), then reveals each remaining section as it scrolls into view.
 *
 * Doing this in JS rather than with `animation-timeline: view()` is deliberate:
 * Lightning CSS — which Tailwind v4 runs — rewrites the authored CSS into the
 * Animations Level 2 shorthand, and Chrome rejects `view()` in that position,
 * which left every section stuck at opacity 0. See the `.js-reveal` rules in
 * `globals.css`.
 *
 * Ordering matters. `js-reveal` is added only after the on-screen elements are
 * already marked revealed, so nothing above the fold flashes out and back in.
 */
export function RevealOnScroll() {
  useEffect(() => {
    const root = document.documentElement;
    const scroller = document.querySelector<HTMLElement>("[data-reveal-root]");
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(".reveal-on-scroll"),
    );
    if (elements.length === 0) return;

    // No IntersectionObserver (or reduced motion): leave everything visible.
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!("IntersectionObserver" in window) || prefersReducedMotion) {
      return;
    }

    const viewportBottom = scroller
      ? scroller.getBoundingClientRect().bottom
      : window.innerHeight;

    for (const el of elements) {
      if (el.getBoundingClientRect().top < viewportBottom) {
        el.classList.add("is-revealed");
      }
    }

    root.classList.add("js-reveal");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      },
      {
        root: scroller ?? null,
        // Hold the reveal until the section is a little way in, so it animates
        // as the reader arrives at it rather than at the very edge.
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.05,
      },
    );

    for (const el of elements) {
      if (!el.classList.contains("is-revealed")) observer.observe(el);
    }

    return () => {
      observer.disconnect();
      root.classList.remove("js-reveal");
    };
  }, []);

  return null;
}
