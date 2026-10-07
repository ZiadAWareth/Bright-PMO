"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save } from "lucide-react";
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
 * Add a vendor from a project's procurement page.
 *
 * Replaces the "Add Vendor" dialog. Vendors are a shared directory rather
 * than project-scoped, so the created vendor is available to every project,
 * same as before.
 */
export default function NewProjectVendorPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;

  const [submitting, setSubmitting] = useState(false);
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
      await axios.post(
        "/api/vendors",
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

      toast.success("Vendor added");
      router.push(`${backHref}?tab=vendors`);
    } catch (e) {
      const err = e as {
        response?: { data?: { error?: string; message?: string } };
      };
      const message =
        err.response?.data?.error ??
        err.response?.data?.message ??
        "Failed to add vendor";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout hideHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <PageHeader
            title="New Vendor"
            subtitle="Add a vendor to the procurement directory"
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
                  placeholder="Enter vendor name"
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
                  placeholder="Enter contact person name"
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
                  placeholder="Enter email or phone"
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
                  placeholder="Enter vendor address"
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
              busyLabel="Adding…"
              icon={<Save className="h-4 w-4" aria-hidden="true" />}
            >
              Add Vendor
            </SubmitButton>
          </FormFooter>
        </form>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
