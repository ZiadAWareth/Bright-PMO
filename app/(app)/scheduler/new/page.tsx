"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Save } from "lucide-react";
import {
  CancelButton,
  Field,
  FieldGrid,
  FormFooter,
  FormSection,
  InfoGrid,
  PageHeader,
  SubmitButton,
  inputClass,
  textareaClass,
} from "@/components/ui/form-shell";
import { Dropdown } from "@/components/ui/dropdown";
import { toast } from "sonner";
import axios from "@/lib/axios";


interface CreateScheduleForm {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimated_budget: string;
  notes: string;
  portfolio_id?: number;
  eps_level_id?: number;
}

const CreateSchedulePage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateScheduleForm>({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    priority: "MEDIUM",
    estimated_budget: "",
    notes: "",
    portfolio_id: undefined,
    eps_level_id: undefined,
  });

  const [portfolios, setPortfolios] = useState<Array<{ portfolio_id: number; name: string }>>([]);
  const [epsLevels, setEpsLevels] = useState<Array<{ eps_id: number; name: string; level: number }>>([]);
  const [loadingData, setLoadingData] = useState(true);

  const handleInputChange = (field: keyof CreateScheduleForm, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Fetch portfolios and EPS levels on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/auth/login");
          return;
        }

        // Fetch portfolios
        const portfoliosResponse = await axios.get("/api/portfolios", {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Portfolios response:", portfoliosResponse.data);
        setPortfolios(portfoliosResponse.data || []);

        // Fetch EPS levels
        const epsResponse = await axios.get("/api/eps", {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log("EPS response:", epsResponse.data);
        setEpsLevels(epsResponse.data || []);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("Failed to load portfolios and EPS levels");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [router]);

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error("Schedule name is required");
      return false;
    }
    if (!formData.description.trim()) {
      toast.error("Description is required");
      return false;
    }
    if (!formData.start_date) {
      toast.error("Start date is required");
      return false;
    }
    if (!formData.end_date) {
      toast.error("End date is required");
      return false;
    }
    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      toast.error("End date must be after start date");
      return false;
    }
    if (parseFloat(formData.estimated_budget) < 0) {
      toast.error("Budget cannot be negative");
      return false;
    }
    if (!formData.portfolio_id) {
      toast.error("Portfolio is required");
      return false;
    }
    if (!formData.eps_level_id) {
      toast.error("EPS Level is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/auth/login");
        return;
      }

      const response = await axios.post("/api/schedules", {
        ...formData,
        estimated_budget: parseFloat(formData.estimated_budget) || 0
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Schedule created successfully!");
      router.push(`/scheduler/${response.data.schedule.schedule_id}`);
    } catch (error: any) {
      console.error("Failed to create schedule:", error);
      const errorMessage = error.response?.data?.message || "Failed to create schedule";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Derived once so the summary and the submitted payload cannot disagree.
  const durationDays =
    formData.start_date && formData.end_date
      ? Math.ceil(
          (new Date(formData.end_date).getTime() -
            new Date(formData.start_date).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

  const budgetLabel = formData.estimated_budget
    ? `OMR ${parseFloat(formData.estimated_budget).toLocaleString()}`
    : "—";

  const summaryRows: [string, React.ReactNode][] = [
    ["Duration", durationDays !== null ? `${durationDays} days` : "Not set"],
    [
      "Priority",
      <span key="priority" className="capitalize">
        {formData.priority.toLowerCase()}
      </span>,
    ],
    [
      "Budget",
      <span key="budget" className="tabular-nums">
        {budgetLabel}
      </span>,
    ],
    [
      "Portfolio",
      formData.portfolio_id
        ? (portfolios.find((p) => p.portfolio_id === formData.portfolio_id)
            ?.name ?? "Unknown")
        : "Not assigned",
    ],
    [
      "EPS Level",
      formData.eps_level_id
        ? (epsLevels.find((e) => e.eps_id === formData.eps_level_id)?.name ??
          "Unknown")
        : "Not assigned",
    ],
  ];

  return (
    <ProtectedRoute>
      <DashboardLayout hideHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <PageHeader
            title="New Schedule"
            subtitle="Set up a project schedule for simulation and analysis"
            backHref="/scheduler"
            backLabel="Back to Schedules"
          />

          <FormSection
            title="Basic Information"
            description="The core details of this project schedule."
          >
            <FieldGrid>
              <Field label="Schedule Name" required htmlFor="name" full>
                <input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="e.g. Phase 2 Civil Works"
                  disabled={loading}
                  className={inputClass}
                />
              </Field>

              <Field label="Description" required htmlFor="description" full>
                <textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Describe the project schedule"
                  disabled={loading}
                  className={textareaClass}
                />
              </Field>

              <Field label="Start Date" required htmlFor="start_date">
                <input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    handleInputChange("start_date", e.target.value)
                  }
                  disabled={loading}
                  className={inputClass}
                />
              </Field>

              <Field
                label="End Date"
                required
                htmlFor="end_date"
                hint={
                  durationDays !== null && durationDays > 0
                    ? `${durationDays} days`
                    : undefined
                }
              >
                <input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  min={formData.start_date || undefined}
                  onChange={(e) => handleInputChange("end_date", e.target.value)}
                  disabled={loading}
                  className={inputClass}
                />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormSection
            title="Placement"
            description="Where this schedule sits in the portfolio and enterprise structure."
          >
            <FieldGrid>
              <Field label="Portfolio" required htmlFor="portfolio">
                <Dropdown
                  id="portfolio"
                  value={formData.portfolio_id?.toString() ?? ""}
                  onChange={(v: string) =>
                    handleInputChange(
                      "portfolio_id",
                      v ? parseInt(v) : undefined,
                    )
                  }
                  options={[
                    { value: "", label: "Select portfolio" },
                    ...portfolios.map((portfolio) => ({
                      value: portfolio.portfolio_id.toString(),
                      label: portfolio.name,
                    })),
                  ]}
                  disabled={loadingData || loading}
                />
              </Field>

              <Field label="EPS Level" required htmlFor="eps">
                <Dropdown
                  id="eps"
                  value={formData.eps_level_id?.toString() ?? ""}
                  onChange={(v: string) =>
                    handleInputChange(
                      "eps_level_id",
                      v ? parseInt(v) : undefined,
                    )
                  }
                  options={[
                    { value: "", label: "Select EPS level" },
                    ...epsLevels.map((eps) => ({
                      value: eps.eps_id.toString(),
                      label: `${eps.name} (Level ${eps.level})`,
                    })),
                  ]}
                  disabled={loadingData || loading}
                />
              </Field>

              <Field label="Priority" htmlFor="priority">
                <Dropdown
                  id="priority"
                  value={formData.priority}
                  onChange={(v: string) => handleInputChange("priority", v)}
                  options={[
                    { value: "LOW", label: "Low" },
                    { value: "MEDIUM", label: "Medium" },
                    { value: "HIGH", label: "High" },
                    { value: "CRITICAL", label: "Critical" },
                  ]}
                  disabled={loading}
                />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormSection
            title="Budget & Notes"
            description="The estimated spend and anything else worth recording."
          >
            <FieldGrid>
              <Field
                label="Estimated Budget"
                htmlFor="estimated_budget"
                hint="In Omani Rial (OMR)."
              >
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-muted">
                    OMR
                  </span>
                  <input
                    id="estimated_budget"
                    type="text"
                    inputMode="decimal"
                    value={
                      formData.estimated_budget
                        ? parseFloat(
                            formData.estimated_budget,
                          ).toLocaleString("en-US", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })
                        : ""
                    }
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/,/g, "");
                      if (rawValue === "" || !isNaN(Number(rawValue))) {
                        handleInputChange("estimated_budget", rawValue);
                      }
                    }}
                    placeholder="0"
                    disabled={loading}
                    className={`${inputClass} pl-14 tabular-nums`}
                  />
                </div>
              </Field>

              <Field label="Additional Notes" htmlFor="notes" full>
                <textarea
                  id="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Any additional notes or requirements…"
                  disabled={loading}
                  className={textareaClass}
                />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormSection
            title="Summary"
            description="What will be created when you submit."
          >
            <InfoGrid rows={summaryRows} />
          </FormSection>

          <FormFooter>
            <CancelButton href="/scheduler" />
            <SubmitButton
              busy={loading}
              busyLabel="Creating…"
              icon={<Save className="h-4 w-4" aria-hidden="true" />}
            >
              Create Schedule
            </SubmitButton>
          </FormFooter>
        </form>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default CreateSchedulePage; 