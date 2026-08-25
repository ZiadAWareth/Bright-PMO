const STEPS = [
  {
    title: "Plan",
    description:
      "Structure the work once — EPS, portfolio, project, WBS and tasks — in the module that owns it.",
  },
  {
    title: "Baseline",
    description:
      "Role-based approval gates lock scope, schedule and budget before delivery starts.",
  },
  {
    title: "Execute",
    description:
      "Progress, timesheets, costs and risks land against the plan, so variance surfaces early.",
  },
  {
    title: "Close",
    description:
      "Punch lists, final inspection, handover and lessons learned from a single source of truth.",
  },
];

/** "How it works" — the delivery lifecycle, as four steps. */
export function LandingHowItWorks() {
  return (
    <section id="workflow" className="border-y border-border bg-bg-surface/40">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="reveal-on-scroll mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-wujha-primary">
            Workflow
          </p>
          <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            A delivery lifecycle you can trace end to end
          </h2>
        </div>

        <ol className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ title, description }, index) => (
            <li key={title} className="reveal-on-scroll relative">
              {/* Connector line (desktop) */}
              {index < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-[calc(50%+1.75rem)] top-5 hidden h-px w-[calc(100%-3.5rem)] bg-border lg:block"
                />
              )}
              <div className="relative flex flex-col items-center text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-wujha-primary text-sm font-bold text-white shadow-md">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-semibold text-text-primary">{title}</h3>
                <p className="mt-1.5 text-sm/relaxed text-text-secondary">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
