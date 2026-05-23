"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Copy,
  Check,
  Upload,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Activity,
  Layers,
  HelpCircle,
} from "lucide-react";
import { PLAN_CONFIGS, PlanDetails } from "@/lib/quota-config";

interface BillingData {
  plan: "free" | "starter" | "pro" | "enterprise";
  planExpiresAt: string | null;
  quotas: {
    emailsPerDay: number;
    emailsPerMonth: number;
    maxCampaigns: number;
    allowedModels: string[];
  };
  usage: {
    campaignsUsed: number;
    dailyUsed: number;
    monthlyUsed: number;
  };
  requests: Array<{
    _id: string;
    plan: "starter" | "pro" | "enterprise";
    amount: number;
    transactionId: string;
    proofFilePath: string;
    proofFileName: string;
    status: "pending" | "approved" | "rejected";
    adminNotes?: string;
    createdAt: string;
  }>;
}

interface PaymentMethod {
  _id: string;
  type: "upi" | "qr_code";
  label: string;
  value: string;
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedUpi, setCopiedUpi] = useState<string | null>(null);

  // Upgrade state
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "pro" | "enterprise" | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [fetchingMethods, setFetchingMethods] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofBase64, setProofBase64] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchBilling = useCallback(async () => {
    try {
      const res = await fetch("/api/user/billing");
      if (!res.ok) throw new Error("Failed to load billing status");
      const json = await res.json();
      setData(json);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const handleOpenUpgrade = async (plan: "starter" | "pro" | "enterprise") => {
    setSelectedPlan(plan);
    setUploadError("");
    setSubmitSuccess(false);
    setTransactionId("");
    setProofFile(null);
    setProofBase64("");

    setFetchingMethods(true);
    try {
      const res = await fetch("/api/payment-methods");
      if (res.ok) {
        const methods = await res.json();
        setPaymentMethods(methods);
      }
    } catch (err) {
      console.error("Failed to load payment methods:", err);
    } finally {
      setFetchingMethods(false);
    }
  };

  const handleCopyUpi = (upiId: string) => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(upiId);
    setTimeout(() => setCopiedUpi(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setUploadError("Please upload an image screenshot or a PDF receipt");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File must be under 5MB");
      return;
    }

    setProofFile(file);
    setUploadError("");

    const reader = new FileReader();
    reader.onload = () => {
      setProofBase64(reader.result as string);
    };
    reader.onerror = () => {
      setUploadError("Failed to process file");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !transactionId.trim() || !proofBase64 || !proofFile) {
      setUploadError("All fields are required");
      return;
    }

    setSubmitting(true);
    setUploadError("");

    try {
      const planConfig = PLAN_CONFIGS[selectedPlan];
      const res = await fetch("/api/user/subscription-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          amount: planConfig.price,
          transactionId: transactionId.trim(),
          proofFileBase64: proofBase64,
          proofFileName: proofFile.name,
        }),
      });

      if (res.ok) {
        setSubmitSuccess(true);
        fetchBilling();
        setTimeout(() => setSelectedPlan(null), 3000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setUploadError(errData.error || "Failed to submit payment details");
      }
    } catch (err) {
      setUploadError("Network connection error — try again");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <Activity className="w-10 h-10 animate-spin text-accent-primary" />
        <p className="text-sm font-semibold text-text-muted">Loading your billing details...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20 bg-bg-surface rounded-3xl border border-border-default space-y-4 max-w-xl mx-auto">
        <AlertCircle className="w-12 h-12 text-error mx-auto animate-pulse" />
        <h3 className="text-lg font-bold">Failed to Load Billing</h3>
        <p className="text-text-secondary text-sm">{error || "No data available."}</p>
        <button
          onClick={() => fetchBilling()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary hover:bg-accent-primary-hover text-white rounded-xl text-sm font-semibold transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  const activePlanName = PLAN_CONFIGS[data.plan]?.name || "Free Trial";
  const activePlanPrice = PLAN_CONFIGS[data.plan]?.price || 0;

  return (
    <div className="space-y-8 animate-fade-in text-text-primary">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Billing & Usage</h1>
        <p className="text-sm text-text-secondary">
          Track campaign limits, monitor daily sending volume, and manage your subscription.
        </p>
      </div>

      {/* Plan Summary & Progress Cards */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Active plan details */}
        <div className="lg:col-span-4 rounded-3xl border border-border-default bg-bg-surface p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 rounded-full bg-accent-primary/5 blur-2xl pointer-events-none group-hover:bg-accent-primary/10 transition-all"></div>
          <div className="relative z-10 space-y-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-accent-dim text-accent-primary border border-accent-primary/15 uppercase tracking-wider">
              {activePlanName}
            </span>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Current Monthly Price</p>
              <p className="text-4xl font-extrabold tracking-tight mt-1 text-text-primary">
                ₹{activePlanPrice.toLocaleString()}
                <span className="text-sm font-semibold text-text-muted">/mo</span>
              </p>
            </div>
            {data.planExpiresAt && (
              <div className="flex items-center gap-2 text-xs text-text-muted bg-bg-base/45 p-3 rounded-2xl border border-border-default/50">
                <Clock className="w-4 h-4 text-accent-primary flex-shrink-0" />
                <span>
                  Renews on: <strong>{new Date(data.planExpiresAt).toLocaleDateString()}</strong>
                </span>
              </div>
            )}
          </div>
          <div className="mt-8 pt-4 border-t border-border-default/50 text-xs text-text-muted">
            Includes custom prompt configurations & load-balanced AI API integrations.
          </div>
        </div>

        {/* Quotas limits meters */}
        <div className="lg:col-span-8 rounded-3xl border border-border-default bg-bg-surface p-6 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent-primary" /> Active Plan Quota Limits
          </h3>

          <div className="space-y-4">
            {/* Campaigns quota */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="text-text-secondary">Campaigns Launched</span>
                <span className="text-text-primary">
                  {data.usage.campaignsUsed} / {data.quotas.maxCampaigns >= 9999 ? "Unlimited" : data.quotas.maxCampaigns}
                </span>
              </div>
              <div className="h-2 w-full bg-bg-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      (data.usage.campaignsUsed / (data.quotas.maxCampaigns || 1)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Daily emails quota */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="text-text-secondary">Emails Sent Today</span>
                <span className="text-text-primary">
                  {data.usage.dailyUsed} / {data.quotas.emailsPerDay}
                </span>
              </div>
              <div className="h-2 w-full bg-bg-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      (data.usage.dailyUsed / (data.quotas.emailsPerDay || 1)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Monthly emails quota */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="text-text-secondary">Emails Sent This Month</span>
                <span className="text-text-primary">
                  {data.usage.monthlyUsed} / {data.quotas.emailsPerMonth}
                </span>
              </div>
              <div className="h-2 w-full bg-bg-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      (data.usage.monthlyUsed / (data.quotas.emailsPerMonth || 1)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Pricing Grid */}
      <div className="space-y-4">
        <div className="text-center sm:text-left">
          <h2 className="text-lg font-bold">Upgrade Subscription Plan</h2>
          <p className="text-xs text-text-muted">Choose a premium outbound tier to unlock advanced AI models and lift quotas.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Starter Plan card */}
          <div
            className={`rounded-3xl border p-6 flex flex-col justify-between bg-bg-surface shadow-sm transition-all duration-300 relative ${
              data.plan === "starter"
                ? "border-amber-500 shadow-md shadow-amber-500/5 ring-1 ring-amber-500"
                : "border-border-default hover:border-border-subtle"
            }`}
          >
            {data.plan === "starter" && (
              <span className="absolute top-4 right-4 text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                ACTIVE
              </span>
            )}
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-base text-text-primary">Starter Plan</h3>
                <p className="text-[10px] text-text-muted mt-0.5">Perfect for quick validation outreach</p>
              </div>
              <p className="text-3xl font-extrabold text-text-primary">
                ₹199
                <span className="text-xs font-semibold text-text-muted">/mo</span>
              </p>
              <ul className="space-y-2 pt-2 border-t border-border-default/50 text-xs text-text-muted">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-primary" />
                  <span>Max 15 active campaigns</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-primary" />
                  <span>100 personalized emails/day</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-primary" />
                  <span>2,000 monthly sending limit</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-primary" />
                  <span>Access Google Gemini models</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleOpenUpgrade("starter")}
              disabled={data.plan === "starter"}
              className={`w-full mt-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                data.plan === "starter"
                  ? "bg-bg-elevated text-text-muted border border-border-default cursor-default"
                  : "bg-accent-primary hover:bg-accent-primary-hover text-white active:scale-[0.98]"
              }`}
            >
              {data.plan === "starter" ? "Active Plan" : "Upgrade Plan"}
            </button>
          </div>

          {/* Pro Plan card */}
          <div
            className={`rounded-3xl border p-6 flex flex-col justify-between bg-bg-surface shadow-sm transition-all duration-300 relative overflow-hidden group ${
              data.plan === "pro"
                ? "border-accent-primary shadow-lg shadow-accent-primary/5 ring-1 ring-accent-primary"
                : "border-border-default hover:border-border-subtle"
            }`}
          >
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-16 h-16 rounded-full bg-accent-primary/5 blur-xl group-hover:bg-accent-primary/10 transition-all pointer-events-none"></div>
            {data.plan === "pro" && (
              <span className="absolute top-4 right-4 text-[9px] font-bold text-accent-primary bg-accent-dim px-2 py-0.5 rounded-full border border-accent-primary/20">
                ACTIVE
              </span>
            )}
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-base text-text-primary">Pro Outbound</h3>
                  <Sparkles className="w-3.5 h-3.5 text-accent-primary animate-pulse" />
                </div>
                <p className="text-[10px] text-text-muted mt-0.5">High-volume personalized outreach</p>
              </div>
              <p className="text-3xl font-extrabold text-text-primary">
                ₹599
                <span className="text-xs font-semibold text-text-muted">/mo</span>
              </p>
              <ul className="space-y-2 pt-2 border-t border-border-default/50 text-xs text-text-muted">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-primary" />
                  <span>Max 50 active campaigns</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-primary" />
                  <span>500 personalized emails/day</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-primary" />
                  <span>10,000 monthly sending limit</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-primary" />
                  <span>Access Google Gemini + Llama models</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleOpenUpgrade("pro")}
              disabled={data.plan === "pro"}
              className={`w-full mt-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                data.plan === "pro"
                  ? "bg-bg-elevated text-text-muted border border-border-default cursor-default"
                  : "bg-accent-primary hover:bg-accent-primary-hover text-white active:scale-[0.98]"
              }`}
            >
              {data.plan === "pro" ? "Active Plan" : "Upgrade Plan"}
            </button>
          </div>

          {/* Enterprise Plan card */}
          <div
            className={`rounded-3xl border p-6 flex flex-col justify-between bg-bg-surface shadow-sm transition-all duration-300 relative ${
              data.plan === "enterprise"
                ? "border-purple-500 shadow-md shadow-purple-500/5 ring-1 ring-purple-500"
                : "border-border-default hover:border-border-subtle"
            }`}
          >
            {data.plan === "enterprise" && (
              <span className="absolute top-4 right-4 text-[9px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                ACTIVE
              </span>
            )}
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-base text-text-primary">Enterprise</h3>
                <p className="text-[10px] text-text-muted mt-0.5">Uncapped scale for power agencies</p>
              </div>
              <p className="text-3xl font-extrabold text-text-primary">
                ₹999
                <span className="text-xs font-semibold text-text-muted">/mo</span>
              </p>
              <ul className="space-y-2 pt-2 border-t border-border-default/50 text-xs text-text-muted">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-primary" />
                  <span>Unlimited campaigns total</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-primary" />
                  <span>2,000 personalized emails/day</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-primary" />
                  <span>50,000 monthly sending limit</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-primary" />
                  <span>Access all active AI models</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleOpenUpgrade("enterprise")}
              disabled={data.plan === "enterprise"}
              className={`w-full mt-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                data.plan === "enterprise"
                  ? "bg-bg-elevated text-text-muted border border-border-default cursor-default"
                  : "bg-accent-primary hover:bg-accent-primary-hover text-white active:scale-[0.98]"
              }`}
            >
              {data.plan === "enterprise" ? "Active Plan" : "Upgrade Plan"}
            </button>
          </div>
        </div>
      </div>

      {/* Subscription request history */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Payment Proof Verification History</h3>
        <div className="overflow-x-auto rounded-3xl border border-border-default bg-bg-surface shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-default text-xs font-semibold text-text-muted bg-bg-base/40">
                <th className="p-4 pl-6">Submitted Date</th>
                <th className="p-4">Upgrade Tier</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Transaction ID</th>
                <th className="p-4">Receipt File</th>
                <th className="p-4 pr-6 text-right">Verification Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default text-xs">
              {data.requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-text-faint">
                    No upgrade requests submitted yet.
                  </td>
                </tr>
              ) : (
                data.requests.map((req) => {
                  const label = PLAN_CONFIGS[req.plan]?.name || req.plan;
                  return (
                    <tr key={req._id} className="hover:bg-bg-base/20 transition-colors">
                      <td className="p-4 pl-6 text-text-muted">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 font-bold text-text-primary">{label}</td>
                      <td className="p-4 font-mono font-semibold">₹{req.amount}</td>
                      <td className="p-4 font-mono font-medium text-text-secondary select-all">{req.transactionId}</td>
                      <td className="p-4 text-text-muted truncate max-w-[150px]" title={req.proofFileName}>
                        {req.proofFileName}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="inline-flex flex-col items-end gap-1">
                          {req.status === "pending" && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 animate-spin" /> Pending Review
                            </span>
                          )}
                          {req.status === "approved" && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Approved
                            </span>
                          )}
                          {req.status === "rejected" && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Rejected
                            </span>
                          )}
                          {req.status === "rejected" && req.adminNotes && (
                            <p className="text-[10px] text-red-400 mt-1 max-w-[200px] text-right font-medium leading-normal bg-red-500/5 px-2.5 py-1.5 rounded-xl border border-red-500/10 shadow-sm animate-fade-in break-words">
                              Reason: {req.adminNotes}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Payment Portal Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-base/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-bg-surface border border-border-default rounded-3xl p-6 shadow-xl relative animate-scale-in max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setSelectedPlan(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-text-faint hover:text-text-muted hover:bg-bg-elevated transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>

            {submitSuccess ? (
              <div className="py-10 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500 border border-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8 animate-bounce" />
                </div>
                <h3 className="text-lg font-bold">Proof Submitted Successfully!</h3>
                <p className="text-xs text-text-secondary max-w-sm mx-auto">
                  Our administrators will verify the transaction reference <strong>{transactionId}</strong> and upgrade your plan limits shortly.
                </p>
                <div className="pt-4">
                  <button
                    onClick={() => setSelectedPlan(null)}
                    className="px-5 py-2.5 bg-bg-elevated hover:bg-bg-base border border-border-default rounded-xl text-xs font-semibold transition-colors"
                  >
                    Close Dialog
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitProof} className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold">Upgrade to {PLAN_CONFIGS[selectedPlan].name}</h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Pay ₹{PLAN_CONFIGS[selectedPlan].price} and submit the receipt reference to upgrade.
                  </p>
                </div>

                {/* Steps Section */}
                <div className="space-y-4 bg-bg-base/45 p-4 rounded-2xl border border-border-default/50">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-accent-primary">Checkout Instructions</h4>

                  {fetchingMethods ? (
                    <div className="flex items-center gap-2 text-xs text-text-muted py-2">
                      <Activity className="w-4 h-4 animate-spin text-accent-primary" />
                      Retrieving payment accounts...
                    </div>
                  ) : paymentMethods.length === 0 ? (
                    <div className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>No active payment routes configured. Please contact the administrator directly.</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Render UPI ID payment lines */}
                      {paymentMethods.filter((m) => m.type === "upi").map((method) => (
                        <div key={method._id} className="flex items-center justify-between gap-3 text-xs bg-bg-surface p-3 rounded-xl border border-border-default/60 shadow-sm">
                          <span className="font-semibold text-text-secondary">{method.label}:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-text-primary bg-bg-elevated px-2 py-1 rounded border border-border-default select-all font-semibold">
                              {method.value}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyUpi(method.value)}
                              className="p-1 rounded bg-bg-elevated hover:bg-accent-dim text-text-faint hover:text-accent-primary border border-border-default transition-all"
                              title="Copy UPI ID"
                            >
                              {copiedUpi === method.value ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Render QR code payment cards */}
                      {paymentMethods.filter((m) => m.type === "qr_code").map((method) => {
                        const filename = method.value.split("/").pop();
                        const qrUrl = `/api/payment-qr/${filename}`;

                        return (
                          <div key={method._id} className="flex flex-col sm:flex-row items-center gap-4 bg-bg-surface p-4 rounded-xl border border-border-default/60 shadow-sm">
                            <div className="w-32 h-32 rounded-lg border border-border-default bg-bg-base overflow-hidden flex items-center justify-center p-1.5 flex-shrink-0 relative group">
                              <img
                                src={qrUrl}
                                alt={method.label}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="space-y-1 text-center sm:text-left">
                              <h5 className="font-bold text-xs text-text-primary">{method.label}</h5>
                              <p className="text-[10px] text-text-muted leading-relaxed">
                                Scan this QR code inside GPay, PhonePe, Paytm, or any UPI banking app to make the payment of <strong>₹{PLAN_CONFIGS[selectedPlan!].price}</strong>.
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Form fields */}
                <div className="space-y-4">
                  {/* Transaction reference */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-secondary">Transaction reference / UPI ID</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 618954728913 or UPI reference number"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs rounded-xl border border-border-default bg-bg-elevated text-text-primary placeholder:text-text-faint focus:border-accent-primary focus:ring-1 focus:ring-accent-primary outline-none transition-all font-mono font-medium"
                    />
                  </div>

                  {/* Receipt screenshot upload */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary">Upload Payment Receipt Screenshot</label>
                    <div
                      onClick={() => !proofFile && document.getElementById("proof-file-input")?.click()}
                      className={`rounded-2xl border-2 border-dashed p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[120px] ${
                        proofFile
                          ? "border-border-subtle bg-bg-surface cursor-default"
                          : "border-border-default bg-bg-elevated hover:border-border-subtle"
                      }`}
                    >
                      <input
                        id="proof-file-input"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />

                      {proofFile ? (
                        <div className="space-y-2">
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                          <div>
                            <p className="text-xs font-medium text-text-primary truncate max-w-[280px]">
                              {proofFile.name}
                            </p>
                            <p className="text-[10px] text-text-muted mt-0.5">
                              {(proofFile.size / 1024).toFixed(1)} KB — Ready
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProofFile(null);
                              setProofBase64("");
                            }}
                            className="text-[10px] font-bold text-text-faint hover:text-error transition-colors underline"
                          >
                            Change File
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 text-text-muted">
                          <Upload className="w-5 h-5 mx-auto text-text-faint" />
                          <div>
                            <p className="text-xs font-medium">Click to upload screenshot</p>
                            <p className="text-[10px] text-text-faint mt-0.5">PNG, JPG, WEBP, or PDF under 5MB</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {uploadError && (
                  <div className="text-xs text-error bg-error-dim border border-error/20 p-3 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Submit Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(null)}
                    className="flex-1 py-2.5 rounded-xl border border-border-default hover:bg-bg-elevated text-xs font-bold transition-all text-text-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !proofBase64 || !transactionId.trim() || fetchingMethods}
                    className="flex-1 py-2.5 bg-accent-primary hover:bg-accent-primary-hover disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-accent-primary/10 flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  >
                    {submitting ? (
                      <>
                        <Activity className="w-3.5 h-3.5 animate-spin" />
                        Submitting Proof...
                      </>
                    ) : (
                      <>
                        <span>Submit Proof</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
