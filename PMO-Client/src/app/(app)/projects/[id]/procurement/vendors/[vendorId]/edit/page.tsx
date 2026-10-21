"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, Save } from "lucide-react";
import { notConnected } from "@/lib/not-connected";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
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

  // notConnected: the vendor (to prefill the form) would be loaded here.
  // Until then the form starts empty.
  const loading = false;
  const notFound = false;
  const submitting = false;
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [address, setAddress] = useState("");
  const [performanceRating, setPerformanceRating] = useState("0");

  const backHref = `/projects/${projectId}/procurement`;

  const validate = (): string | null => {
    if (!name.trim()) return "Vendor name is required.";
    if (!contactPerson.trim()) return "Contact person is required.";
    if (!contactInfo.trim()) return "Contact information is required.";
    if (!address.trim()) return "Address is required.";
    if (!category.trim()) return "Please select a category.";
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    notConnected("Updating the vendor");
  };

  if (loading) {
    return (
      <>
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
      </>
    );
  }

  if (notFound) {
    return (
      <>
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
      </>
    );
  }

  return (
    <>
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
    </>
  );
}
