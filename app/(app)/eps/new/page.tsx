"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  Field,
  FormFooter,
  FormSection,
  PageHeader,
  inputClass,
  textareaClass,
} from "@/components/ui/form-shell";

interface ParentEps {
  eps_id: number;
  name: string;
  level: number;
  eps_code?: string;
}

const MAX_LEVEL = 6;

/**
 * Create an EPS node.
 *
 * Replaces the modal that used to open over the directory. A full route means
 * the form is linkable, survives a refresh, and has room for the parent picker
 * to explain itself rather than being squeezed into a dialog.
 */
export default function NewEpsPage() {
  const router = useRouter();

  const [allEps, setAllEps] = useState<ParentEps[]>([]);
  const [loadingParents, setLoadingParents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState(1);
  const [parentEpsId, setParentEpsId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get("/api/eps", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!cancelled) {
          setAllEps(Array.isArray(res.data) ? res.data : []);
        }
      } catch {
        if (!cancelled) toast.error("Could not load the existing EPS tree");
      } finally {
        if (!cancelled) setLoadingParents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // A node's parent must sit exactly one level above it.
  const eligibleParents =
    level > 1 ? allEps.filter((eps) => eps.level === level - 1) : [];

  const handleLevelChange = (nextLevel: number) => {
    setLevel(nextLevel);
    // The previous parent belongs to the old level, so it can never still apply.
    setParentEpsId(null);
  };

  const validate = (): string | null => {
    if (!name.trim()) return "EPS name is required.";
    if (level === 1 && parentEpsId !== null) {
      return "A level 1 EPS is a root node and cannot have a parent.";
    }
    if (level > 1) {
      if (parentEpsId === null) {
        return `Select a level ${level - 1} parent for this EPS.`;
      }
      if (!eligibleParents.some((eps) => eps.eps_id === parentEpsId)) {
        return `The selected parent is not a level ${level - 1} EPS.`;
      }
    }
    return null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await axios.post(
        "/api/eps",
        {
          name: name.trim(),
          description: description.trim() || null,
          level: Number(level),
          parent_eps_id: parentEpsId,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
      );
      toast.success("EPS created");
      router.push("/eps");
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      const message = err.response?.data?.error ?? "Failed to create EPS";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout hideHeader>
        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
          <PageHeader
            title="New EPS"
            subtitle="Add a node to the enterprise project structure"
            backHref="/eps"
          />

          {error && (
            <div
              role="alert"
              className="rounded-[12px] border border-wujha-danger/30 bg-wujha-danger/10 px-4 py-3 text-[13.5px] text-wujha-danger"
            >
              {error}
            </div>
          )}

          <FormSection
            title="Details"
            description="Name and describe this level of the structure."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Name" required htmlFor="eps-name" full>
                <input
                  id="eps-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Infrastructure Programme"
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Description" htmlFor="eps-description" full>
                <textarea
                  id="eps-description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What sits under this node?"
                  disabled={submitting}
                  className={textareaClass}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            title="Placement"
            description="Where this node sits in the hierarchy."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Level"
                required
                htmlFor="eps-level"
                hint="Level 1 is a root node."
              >
                <select
                  id="eps-level"
                  value={level}
                  onChange={(e) => handleLevelChange(Number(e.target.value))}
                  disabled={submitting}
                  className={inputClass}
                >
                  {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((l) => (
                    <option key={l} value={l}>
                      Level {l}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Parent EPS"
                required={level > 1}
                htmlFor="eps-parent"
                hint={
                  level === 1
                    ? "Root nodes have no parent."
                    : loadingParents
                      ? "Loading available parents…"
                      : eligibleParents.length === 0
                        ? `No level ${level - 1} EPS exists yet — create one first.`
                        : `Showing level ${level - 1} nodes only.`
                }
              >
                <select
                  id="eps-parent"
                  value={parentEpsId ?? ""}
                  onChange={(e) =>
                    setParentEpsId(e.target.value ? Number(e.target.value) : null)
                  }
                  disabled={submitting || level === 1 || loadingParents}
                  className={inputClass}
                >
                  <option value="">
                    {level === 1 ? "None (root)" : "Select a parent…"}
                  </option>
                  {eligibleParents.map((eps) => (
                    <option key={eps.eps_id} value={eps.eps_id}>
                      {eps.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </FormSection>

          <FormFooter>
            <Link
              href="/eps"
              className="inline-flex h-10 items-center rounded-[10px] border border-border px-4 text-[13.5px] font-medium text-text-secondary transition-colors hover:bg-bg-surface-alt hover:text-text-primary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-wujha-primary px-5 text-[13.5px] font-semibold text-white transition-colors hover:bg-wujha-primary-hover disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Creating…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Create EPS
                </>
              )}
            </button>
          </FormFooter>
        </form>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
