const STATS = [
  { value: "12", label: "Integrated delivery modules" },
  { value: "Multi-level", label: "EPS, portfolios & programmes" },
  { value: "EVM", label: "CPI & SPI on every project" },
  { value: "100%", label: "Task-level audit trail" },
];

/** Trust band of headline figures, just below the hero. */
export function LandingStats() {
  return (
    <section className="border-y border-border bg-bg-surface/40">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-5 sm:px-8 lg:grid-cols-4">
        {STATS.map(({ value, label }) => (
          <div
            key={label}
            className="reveal-on-scroll flex flex-col px-4 py-8 text-center lg:py-10"
          >
            {/* The type scale is capped so the word-based figures ("Multi-level")
                stay on one line at every breakpoint — that keeps all four labels
                on a shared baseline across the band. */}
            <div className="flex min-h-[2.25rem] items-center justify-center sm:min-h-[2.75rem]">
              <p className="text-xl font-bold leading-tight tracking-tight text-wujha-primary sm:text-2xl lg:text-3xl">
                {value}
              </p>
            </div>
            <p className="mt-2 text-sm text-text-secondary">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
