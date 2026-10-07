"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, Save } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  CancelButton,
  Field,
  FieldGrid,
  FormError,
  FormFooter,
  FormSection,
  PageHeader,
  SubmitButton,
  inputClass,
  textareaClass,
} from "@/components/ui/form-shell";
import { Dropdown } from "@/components/ui/dropdown";
import { Spinner } from "@/components/ui/spinner";

const CATEGORY_OPTIONS = [
  "Construction",
  "IT Services",
  "Consulting",
  "Equipment",
  "Materials",
  "Other",
];

const RATING_OPTIONS = [
  { value: "0", label: "Not Rated" },
  { value: "1", label: "1 - Poor" },
  { value: "2", label: "2 - Below Average" },
  { value: "3", label: "3 - Average" },
  { value: "4", label: "4 - Good" },
  { value: "5", label: "5 - Excellent" },
];

/**
 * Edit a vendor from a project's procurement page.
 *
 * Replaces the "Edit Vendor" dialog.
 */
export default function EditProjectVendorPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const vendorId = params?.vendorId as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [address, setAddress] = useState("");
  const [performanceRating, setPerformanceRating] = useState("0");

  const backHref = `/projects/${projectId}/procurement`;

  useEffect(() => {
    if (!vendorId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await axios.get(`/api/vendors/${vendorId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (cancelled) return;

        const v = res.data;
        if (!v) {
          setNotFound(true);
          return;
        }

        setName(v.name ?? "");
        setCategory(v.category ?? "");
        setContactPerson(v.contact_person ?? "");
        setContactInfo(v.contact_info ?? "");
        setAddress(v.address ?? "");
        setPerformanceRating(String(v.performance_rating ?? "0"));
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  const validate = (): string | null => {
    if (!name.trim()) return "Vendor name is required.";
    if (!contactPerson.trim()) return "Contact person is required.";
    if (!contactInfo.trim()) return "Contact information is required.";
    if (!address.trim()) return "Address is required.";
    if (!category.trim()) return "Please select a category.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await axios.put(
        `/api/vendors/${vendorId}`,
        {
          name: name.trim(),
          contact_person: contactPerson.trim(),
          contact_info: contactInfo.trim(),
          address: address.trim(),
          category: category.trim(),
          performance_rating: parseFloat(performanceRating),
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      toast.success("Vendor updated");
      router.push(`${backHref}?tab=vendors`);
    } catch (e) {
      const err = e as {
        response?: { data?: { error?: string; message?: string } };
      };
      const message =
        err.response?.data?.error ??
        err.response?.data?.message ??
        "Failed to update vendor";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout hideHeader>
          <div className="space-y-6">
            <PageHeader
              title="Edit Vendor"
              backHref={backHref}
              backLabel="Back to Procurement"
            />
            <div className="flex items-center justify-center py-24">
              <Spinner size={32} className="text-bright" />
              <span className="ml-3 text-[13.5px] text-muted">
                Loading vendor…
              </span>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (notFound) {
    return (
      <ProtectedRoute>
        <DashboardLayout hideHeader>
          <div className="space-y-6">
            <PageHeader
              title="Edit Vendor"
              backHref={backHref}
              backLabel="Back to Procurement"
            />
            <FormSection>
              <div className="py-10 text-center">
                <AlertCircle
                  size={40}
                  className="mx-auto mb-4 text-faint"
                  aria-hidden="true"
                />
                <h2 className="text-[15px] font-semibold text-ink">
                  Vendor not found
                </h2>
                <p className="mt-1 text-[13.5px] text-muted">
                  The vendor you are trying to edit could not be found.
                </p>
                <div className="mt-5 flex justify-center">
                  <CancelButton href={backHref}>
                    Back to Procurement
                  </CancelButton>
                </div>
              </div>
            </FormSection>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout hideHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <PageHeader
            title="Edit Vendor"
            subtitle={name || undefined}
            backHref={backHref}
            backLabel="Back to Procurement"
          />

          <FormError>{error}</FormError>

          <FormSection
            title="Vendor Details"
            description="Who they are and how to reach them."
          >
            <FieldGrid>
              <Field label="Vendor Name" required htmlFor="name">
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Category" required htmlFor="category">
                <Dropdown
                  id="category"
                  value={category}
                  onChange={setCategory}
                  options={[
                    { value: "", label: "Select category" },
                    ...CATEGORY_OPTIONS.map((c) => ({ value: c, label: c })),
                  ]}
                  ariaLabel="Category"
                  disabled={submitting}
                />
              </Field>

              <Field label="Contact Person" required htmlFor="contact_person">
                <input
                  id="contact_person"
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Contact Info" required htmlFor="contact_info">
                <input
                  id="contact_info"
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Address" required htmlFor="address" full>
                <textarea
                  id="address"
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={submitting}
                  className={textareaClass}
                />
              </Field>

              <Field label="Performance Rating" htmlFor="performance_rating">
                <Dropdown
                  id="performance_rating"
                  value={performanceRating}
                  onChange={setPerformanceRating}
                  options={RATING_OPTIONS}
                  ariaLabel="Performance rating"
                  disabled={submitting}
                />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormFooter>
            <CancelButton href={backHref} />
            <SubmitButton
              busy={submitting}
              busyLabel="Saving…"
              icon={<Save className="h-4 w-4" aria-hidden="true" />}
            >
              Save Changes
            </SubmitButton>
          </FormFooter>
        </form>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
