"use client";

import { Check, ChevronRight } from "lucide-react";
import { STEPS, type StepKey } from "./types";

export function StepIndicator({
  currentStep,
  canConfigure,
  canGenerate,
  onGoToStep,
}: {
  currentStep: StepKey;
  canConfigure: boolean;
  canGenerate: boolean;
  onGoToStep: (step: StepKey) => void;
}) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  const isClickable = (key: StepKey) =>
    key === "select-table" ||
    (key === "configure-columns" && canConfigure) ||
    (key === "generate" && canGenerate);

  return (
    <div className="rounded-2xl border border-border bg-bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-2 overflow-x-auto sm:gap-3">
        {STEPS.map((step, index) => {
          const active = step.key === currentStep;
          const completed = index < currentIndex;
          const clickable = isClickable(step.key);

          return (
            <div key={step.key} className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => clickable && onGoToStep(step.key)}
                disabled={!clickable}
                aria-current={active ? "step" : undefined}
                className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-bright-primary focus-visible:ring-offset-2 ${
                  active
                    ? "bg-bright-primary text-white shadow-sm"
                    : completed
                      ? "bg-success-soft text-success hover:bg-success-soft  "
                      : clickable
                        ? "bg-bg-surface-alt text-text-secondary hover:bg-bright-primary/5 hover:text-bright-primary"
                        : "cursor-not-allowed bg-bg-surface-alt text-text-secondary/50"
                }`}
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    active
                      ? "bg-white/20 text-white"
                      : completed
                        ? "bg-success text-white "
                        : "bg-bg-surface text-text-secondary"
                  }`}
                >
                  {completed ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className="flex min-w-0 flex-col items-start leading-tight">
                  <span className="truncate">{step.label}</span>
                  <span
                    className={`hidden truncate text-[11px] font-normal sm:block ${
                      active ? "text-white/80" : "text-text-secondary/70"
                    }`}
                  >
                    {step.description}
                  </span>
                </span>
              </button>

              {index < STEPS.length - 1 && (
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-text-secondary/40"
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
