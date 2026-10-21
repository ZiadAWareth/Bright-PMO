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

interface Procurement {
  procurement_id: number;
  description: string;
}

interface Vendor {
  vendor_id: number;
  name: string;
}

const STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "Active", label: "Active" },
  { value: "Completed", label: "Completed" },
  { value: "Terminated", label: "Terminated" },
];

/**
 * Edit a contract from a project's procurement page.
 *
 * Replaces the "Edit Contract" dialog.
 */
export default function EditProjectContractPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const contractId = params?.contractId as string;

  const [procurements] = useState<Procurement[]>([]);
  const [vendors] = useState<Vendor[]>([]);
  // notConnected: the contract, procurements and vendors (to prefill the form) would be loaded here.
  // Until then the form starts empty.
  const loading = false;
  const notFound = false;
  const submitting = false;
  const [error, setError] = useState<string | null>(null);

  const [procurementId, setProcurementId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("Draft");

  const backHref = `/projects/${projectId}/procurement`;

  const validate = (): string | null => {
    if (!procurementId) return "Please select a procurement.";
    if (!vendorId) return "Please select a vendor.";
    if (!contractNumber.trim()) return "Contract number is required.";
    if (!name.trim()) return "Contract name is required.";
    if (!startDate) return "Start date is required.";
    if (!endDate) return "End date is required.";
    if (!value || isNaN(parseFloat(value))) return "Contract value is required.";
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
    notConnected("Updating the contract");
  };

  if (loading) {
    return (
      <>
        <DashboardLayout hideHeader>
          <div className="space-y-6">
            <PageHeader
              title="Edit Contract"
              backHref={backHref}
              backLabel="Back to Procurement"
            />
            <div className="flex items-center justify-center py-24">
              <Spinner size={32} className="text-bright" />
              <span className="ml-3 text-[13.5px] text-muted">
                Loading contract…
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
              title="Edit Contract"
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
                  Contract not found
                </h2>
                <p className="mt-1 text-[13.5px] text-muted">
                  The contract you are trying to edit could not be found.
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
            title="Edit Contract"
            subtitle={name || undefined}
            backHref={backHref}
            backLabel="Back to Procurement"
          />

          <FormError>{error}</FormError>

          <FormSection
            title="Contract Parties"
            description="Which procurement and vendor this contract is for."
          >
            <FieldGrid>
              <Field label="Procurement" required htmlFor="procurement">
                <Dropdown
                  id="procurement"
                  value={procurementId}
                  onChange={setProcurementId}
                  options={[
                    { value: "", label: "Select a procurement" },
                    ...procurements.map((p) => ({
                      value: String(p.procurement_id),
                      label: p.description,
                    })),
                  ]}
                  searchable
                  ariaLabel="Procurement"
                  disabled={submitting}
                />
              </Field>

              <Field label="Vendor" required htmlFor="vendor">
                <Dropdown
                  id="vendor"
                  value={vendorId}
                  onChange={setVendorId}
                  options={[
                    { value: "", label: "Select a vendor" },
                    ...vendors.map((v) => ({
                      value: String(v.vendor_id),
                      label: v.name,
                    })),
                  ]}
                  searchable
                  ariaLabel="Vendor"
                  disabled={submitting}
                />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormSection
            title="Contract Details"
            description="Identification, terms and value."
          >
            <FieldGrid>
              <Field label="Contract Number" required htmlFor="contract_number">
                <input
                  id="contract_number"
                  type="text"
                  value={contractNumber}
                  onChange={(e) => setContractNumber(e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Contract Name" required htmlFor="name">
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Description" htmlFor="description" full>
                <textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={submitting}
                  className={textareaClass}
                />
              </Field>

              <Field label="Start Date" required htmlFor="start_date">
                <input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="End Date" required htmlFor="end_date">
                <input
                  id="end_date"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Value (OMR)" required htmlFor="value">
                <input
                  id="value"
                  type="number"
                  min={0}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Status" htmlFor="status">
                <Dropdown
                  id="status"
                  value={status}
                  onChange={setStatus}
                  options={STATUS_OPTIONS}
                  ariaLabel="Status"
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
