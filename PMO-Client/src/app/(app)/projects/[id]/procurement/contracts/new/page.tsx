"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save } from "lucide-react";
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
 * Add a contract from a project's procurement page.
 *
 * Replaces the "Add Contract" dialog.
 */
export default function NewProjectContractPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;

  // notConnected: the project's procurements and the vendors would be loaded here.
  const [procurements] = useState<Procurement[]>([]);
  const [vendors] = useState<Vendor[]>([]);
  const loadingData = false;
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
    notConnected("Creating the contract");
  };

  return (
    <>
      <DashboardLayout hideHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <PageHeader
            title="New Contract"
            subtitle="Create a contract with a vendor for this project"
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
                  disabled={submitting || loadingData}
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
                  disabled={submitting || loadingData}
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
              busyLabel="Adding…"
              icon={<Save className="h-4 w-4" aria-hidden="true" />}
            >
              Add Contract
            </SubmitButton>
          </FormFooter>
        </form>
      </DashboardLayout>
    </>
  );
}
