"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

interface Procurement {
  procurement_id: number;
  description: string;
  status: string;
  project?: { name: string };
}

interface Vendor {
  vendor_id: number;
  name: string;
}

/**
 * Add an RFQ response.
 *
 * Replaces the "Add RFQ response" dialog on the RFQ management page.
 * Recording a response is also how a procurement gets awarded: the API call
 * that creates the response is followed by marking the chosen procurement
 * "Awarded" with its actual cost set to the quote, exactly as the dialog did.
 */
export default function NewRfqResponsePage() {
  const router = useRouter();

  const [procurements, setProcurements] = useState<Procurement[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [procurementId, setProcurementId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [technicalScore, setTechnicalScore] = useState("0");
  const [commercialScore, setCommercialScore] = useState("0");
  const [totalScore, setTotalScore] = useState("0");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const auth = {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      };
      try {
        const [procRes, vendorRes] = await Promise.all([
          axios.get("/api/procurements", auth),
          axios.get("/api/vendors", auth),
        ]);
        if (cancelled) return;
        setProcurements(Array.isArray(procRes.data) ? procRes.data : []);
        setVendors(Array.isArray(vendorRes.data) ? vendorRes.data : []);
      } catch {
        if (!cancelled) toast.error("Could not load procurements or vendors");
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const openProcurements = procurements.filter(
    (p) =>
      p.status === "Tendering" ||
      p.status === "Planning" ||
      p.status === "Approved",
  );

  const validate = (): string | null => {
    if (!procurementId) return "Please select a procurement.";
    if (!vendorId) return "Please select a vendor.";
    if (!quoteAmount || isNaN(parseFloat(quoteAmount))) {
      return "Quote amount is required.";
    }
    if (!deliveryDays || isNaN(parseInt(deliveryDays, 10))) {
      return "Delivery time is required.";
    }
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
      const auth = {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      };

      const res = await axios.post(
        "/api/rfq-responses",
        {
          procurement_id: parseInt(procurementId),
          vendor_id: parseInt(vendorId),
          quote_amount: parseFloat(quoteAmount),
          delivery_time: `${deliveryDays} days`,
          technical_score: parseFloat(technicalScore) || 0,
          commercial_score: parseFloat(commercialScore) || 0,
          total_score: parseFloat(totalScore) || 0,
          notes,
        },
        auth,
      );

      if (res.status === 201) {
        const procurement = procurements.find(
          (p) => p.procurement_id === parseInt(procurementId),
        );
        if (procurement) {
          try {
            await axios.put(
              `/api/procurements/${procurement.procurement_id}`,
              {
                ...procurement,
                status: "Awarded",
                actual_cost: parseFloat(quoteAmount),
              },
              auth,
            );
          } catch (err) {
            console.error("Error updating procurement status:", err);
          }
        }

        toast.success("RFQ Response added and procurement awarded");
        router.push("/rfq-management?tab=responses");
      }
    } catch (e) {
      const err = e as {
        response?: { data?: { error?: string; message?: string } };
      };
      const message =
        err.response?.data?.error ??
        err.response?.data?.message ??
        "Failed to add RFQ response";
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
            title="New RFQ Response"
            subtitle="Record a vendor's bid. Submitting awards the procurement."
            backHref="/rfq-management"
            backLabel="Back to RFQ Management"
          />

          <FormError>{error}</FormError>

          <FormSection
            title="Bid"
            description="Which procurement and vendor this response is for."
          >
            <FieldGrid>
              <Field label="Procurement" required htmlFor="procurement">
                <Dropdown
                  id="procurement"
                  value={procurementId}
                  onChange={setProcurementId}
                  options={[
                    { value: "", label: "Select a procurement" },
                    ...openProcurements.map((p) => ({
                      value: String(p.procurement_id),
                      label: `${p.description} (${p.project?.name ?? "N/A"}) - ${p.status}`,
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

              <Field label="Quote Amount (OMR)" required htmlFor="quote_amount">
                <input
                  id="quote_amount"
                  type="number"
                  min={0}
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Delivery Time (days)" required htmlFor="delivery_days">
                <input
                  id="delivery_days"
                  type="number"
                  min={1}
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormSection
            title="Evaluation"
            description="Scores out of 100. Leave at 0 if not yet evaluated."
          >
            <FieldGrid>
              <Field label="Technical Score" htmlFor="technical_score">
                <input
                  id="technical_score"
                  type="number"
                  min={0}
                  max={100}
                  value={technicalScore}
                  onChange={(e) => setTechnicalScore(e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Commercial Score" htmlFor="commercial_score">
                <input
                  id="commercial_score"
                  type="number"
                  min={0}
                  max={100}
                  value={commercialScore}
                  onChange={(e) => setCommercialScore(e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Total Score" htmlFor="total_score">
                <input
                  id="total_score"
                  type="number"
                  min={0}
                  max={100}
                  value={totalScore}
                  onChange={(e) => setTotalScore(e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Notes" htmlFor="notes" full>
                <textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={submitting}
                  className={textareaClass}
                />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormFooter>
            <CancelButton href="/rfq-management" />
            <SubmitButton
              busy={submitting}
              busyLabel="Adding…"
              icon={<Save className="h-4 w-4" aria-hidden="true" />}
            >
              Add RFQ Response
            </SubmitButton>
          </FormFooter>
        </form>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
