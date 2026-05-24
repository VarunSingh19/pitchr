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
  Loader2,
  Target,
} from "lucide-react";
import { PLAN_CONFIGS, PlanDetails } from "@/lib/quota-config";
import { PlanBadge } from "@/components/plan-badge";

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
        <div className="w-12 h-12 border-2 border-[#ea580c] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#ea580c]" />
        </div>
        <p className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
          Loading billing profile...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="border-2 border-red-500 bg-red-500/5 p-8 text-center max-w-xl mx-auto my-20 font-mono">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest">Billing Sync Failed</h3>
        <p className="text-xs text-muted-foreground mt-2">{error || "No data available."}</p>
        <button
          onClick={() => fetchBilling()}
          className="mt-5 px-6 py-2.5 bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:bg-[#ea580c] transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const activePlanName = PLAN_CONFIGS[data.plan]?.name || "Free Trial";
  const activePlanPrice = PLAN_CONFIGS[data.plan]?.price || 0;

  return (
    <div className="space-y-8 animate-fade-in font-mono text-xs text-foreground">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-2.5 h-2.5 bg-[#ea580c] animate-blink" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            // TELEMETRY &amp; LIMITS
          </span>
        </div>
        <h1 className="font-pixel text-3xl sm:text-4xl tracking-tight text-foreground">
          BILLING &amp; QUOTAS
        </h1>
        <p className="text-xs text-muted-foreground mt-1 tracking-wide">
          Manage system plans, examine active pipelines and sending limits
        </p>
      </div>

      {/* Plan Summary & Progress Cards */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Active plan details */}
        <div className="lg:col-span-4 border-2 border-border bg-card p-6 flex flex-col justify-between relative overflow-hidden rounded-none">
          <div className="space-y-4">
            <PlanBadge plan={data.plan} className="text-[9px] px-2.5 py-1 self-start" />
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Plan Rate</p>
              <p className="font-pixel text-3xl tracking-tight mt-1.5 text-foreground">
                ₹{activePlanPrice.toLocaleString()}
                <span className="text-xs font-bold font-mono text-muted-foreground">/mo</span>
              </p>
            </div>
            {data.planExpiresAt && (
              <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground border border-border bg-foreground/[0.01] p-3 rounded-none">
                <Clock className="w-4 h-4 text-[#ea580c] flex-shrink-0" />
                <span>
                  RENEWAL DATE: <strong>{new Date(data.planExpiresAt).toLocaleDateString().toUpperCase()}</strong>
                </span>
              </div>
            )}
          </div>
          <div className="mt-8 pt-4 border-t border-border/60 text-[10px] text-muted-foreground">
            Includes custom prompt configurations &amp; load-balanced AI API integrations.
          </div>
        </div>

        {/* Quotas limits meters */}
        <div className="lg:col-span-8 border-2 border-border bg-card p-6 space-y-6 rounded-none">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#ea580c]" /> ACTIVE PIPELINE ALLOCATION LIMITS
          </h3>

          <div className="space-y-5">
            {/* Campaigns quota */}
            <div>
              <div className="flex items-center justify-between text-[10px] font-bold mb-2 uppercase tracking-wide">
                <span className="text-muted-foreground">Campaigns Launched</span>
                <span className="text-foreground">
                  {data.usage.campaignsUsed} / {data.quotas.maxCampaigns >= 9999 ? "Unlimited" : data.quotas.maxCampaigns}
                </span>
              </div>
              <div className="h-2 w-full bg-muted/40 border border-border overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-500"
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
              <div className="flex items-center justify-between text-[10px] font-bold mb-2 uppercase tracking-wide">
                <span className="text-muted-foreground">Emails Sent Today</span>
                <span className="text-foreground">
                  {data.usage.dailyUsed} / {data.quotas.emailsPerDay}
                </span>
              </div>
              <div className="h-2 w-full bg-muted/40 border border-border overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
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
              <div className="flex items-center justify-between text-[10px] font-bold mb-2 uppercase tracking-wide">
                <span className="text-muted-foreground">Emails Sent This Month</span>
                <span className="text-foreground">
                  {data.usage.monthlyUsed} / {data.quotas.emailsPerMonth}
                </span>
              </div>
              <div className="h-2 w-full bg-muted/40 border border-border overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-500"
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
        <div className="flex items-center gap-4 mb-2">
          <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            // SECTION: Upgrades
          </span>
          <div className="flex-1 border-t border-border" />
          <span className="inline-block h-2 w-2 bg-[#ea580c] animate-blink" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
            01
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Starter Plan card */}
          <div
            className={`border-2 p-6 flex flex-col justify-between bg-card transition-all duration-200 relative rounded-none ${
              data.plan === "starter"
                ? "border-[#ea580c] bg-[#ea580c]/5"
                : "border-border hover:border-foreground/20"
            }`}
          >
            {data.plan === "starter" && (
              <span className="absolute top-4 right-4 text-[8px] font-bold text-amber-500 border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 uppercase tracking-widest rounded-none">
                ACTIVE
              </span>
            )}
            <div className="space-y-4 font-mono">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">Starter Plan</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Quick validation outreach</p>
                </div>
                <PlanBadge plan="starter" />
              </div>
              <p className="font-pixel text-2xl text-foreground">
                ₹199
                <span className="text-xs font-mono text-muted-foreground">/mo</span>
              </p>
              <ul className="space-y-2 pt-4 border-t border-border/60 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#ea580c]" />
                  <span>Max 15 active campaigns</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#ea580c]" />
                  <span>100 personalized emails/day</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#ea580c]" />
                  <span>2,000 monthly sending limit</span>
                </li>
                <li className="flex items-start gap-2.5 border-2 border-[#ea580c] bg-[#ea580c]/5 p-3 my-2 -mx-1 rounded-none shadow-[2px_2px_0px_0px_rgba(234,88,12,0.15)]">
                  <Target className="w-4 h-4 text-[#ea580c] flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#ea580c] uppercase text-[10px] tracking-wider block">★ Lead Sourcing Engine</span>
                    <p className="text-[10px] text-foreground/90 font-bold leading-snug">
                      30 monthly sourcing queries + unlimited cache hits
                    </p>
                    <p className="text-[9px] text-muted-foreground font-mono leading-tight">
                      Automated scraping, domain resolution, and MX-verified email harvesting
                    </p>
                  </div>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#ea580c]" />
                  <span>Access Google Gemini models</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleOpenUpgrade("starter")}
              disabled={data.plan === "starter"}
              className={`w-full mt-6 py-3 text-xs font-bold uppercase tracking-widest transition-all rounded-none cursor-pointer ${
                data.plan === "starter"
                  ? "bg-foreground/5 text-muted-foreground border border-border cursor-default"
                  : "bg-foreground text-background hover:bg-[#ea580c] hover:text-background"
              }`}
            >
              {data.plan === "starter" ? "Active Plan" : "Upgrade Plan"}
            </button>
          </div>

          {/* Pro Plan card */}
          <div
            className={`border-2 p-6 flex flex-col justify-between bg-card transition-all duration-200 relative rounded-none ${
              data.plan === "pro"
                ? "border-[#ea580c] bg-[#ea580c]/5"
                : "border-border hover:border-foreground/20"
            }`}
          >
            {data.plan === "pro" && (
              <span className="absolute top-4 right-4 text-[8px] font-bold text-[#ea580c] border border-[#ea580c]/20 bg-[#ea580c]/5 px-2 py-0.5 uppercase tracking-widest rounded-none">
                ACTIVE
              </span>
            )}
            <div className="space-y-4 font-mono">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">Pro Outbound</h3>
                    <Sparkles className="w-3.5 h-3.5 text-[#ea580c] animate-pulse" />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">High-volume personalized outreach</p>
                </div>
                <PlanBadge plan="pro" />
              </div>
              <p className="font-pixel text-2xl text-foreground">
                ₹599
                <span className="text-xs font-mono text-muted-foreground">/mo</span>
              </p>
              <ul className="space-y-2 pt-4 border-t border-border/60 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#ea580c]" />
                  <span>Max 50 active campaigns</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#ea580c]" />
                  <span>500 personalized emails/day</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#ea580c]" />
                  <span>10,000 monthly sending limit</span>
                </li>
                <li className="flex items-start gap-2.5 border-2 border-[#ea580c] bg-[#ea580c]/5 p-3 my-2 -mx-1 rounded-none shadow-[2px_2px_0px_0px_rgba(234,88,12,0.2)]">
                  <Target className="w-4 h-4 text-[#ea580c] flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#ea580c] uppercase text-[10px] tracking-wider block">★ Lead Sourcing Engine</span>
                    <p className="text-[10px] text-foreground/90 font-bold leading-snug">
                      90 monthly sourcing queries + unlimited cache hits
                    </p>
                    <p className="text-[9px] text-muted-foreground font-mono leading-tight">
                      Automated scraping, domain resolution, and MX-verified email harvesting
                    </p>
                  </div>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#ea580c]" />
                  <span>Access Gemini + Llama models</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleOpenUpgrade("pro")}
              disabled={data.plan === "pro"}
              className={`w-full mt-6 py-3 text-xs font-bold uppercase tracking-widest transition-all rounded-none cursor-pointer ${
                data.plan === "pro"
                  ? "bg-foreground/5 text-muted-foreground border border-border cursor-default"
                  : "bg-foreground text-background hover:bg-[#ea580c] hover:text-background"
              }`}
            >
              {data.plan === "pro" ? "Active Plan" : "Upgrade Plan"}
            </button>
          </div>

          {/* Enterprise Plan card */}
          <div
            className={`border-2 p-6 flex flex-col justify-between bg-card transition-all duration-200 relative rounded-none ${
              data.plan === "enterprise"
                ? "border-purple-500 bg-purple-500/5 ring-1 ring-purple-500"
                : "border-border hover:border-foreground/20"
            }`}
          >
            {data.plan === "enterprise" && (
              <span className="absolute top-4 right-4 text-[8px] font-bold text-purple-400 border border-purple-500/20 bg-purple-500/5 px-2 py-0.5 uppercase tracking-widest rounded-none">
                ACTIVE
              </span>
            )}
            <div className="space-y-4 font-mono">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">Enterprise</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Uncapped scale for power agencies</p>
                </div>
                <PlanBadge plan="enterprise" />
              </div>
              <p className="font-pixel text-2xl text-foreground">
                ₹999
                <span className="text-xs font-mono text-muted-foreground">/mo</span>
              </p>
              <ul className="space-y-2 pt-4 border-t border-border/60 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#ea580c]" />
                  <span>Unlimited campaigns total</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#ea580c]" />
                  <span>2,000 personalized emails/day</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#ea580c]" />
                  <span>50,000 monthly sending limit</span>
                </li>
                <li className="flex items-start gap-2.5 border-2 border-purple-500 bg-purple-500/5 p-3 my-2 -mx-1 rounded-none shadow-[2px_2px_0px_0px_rgba(168,85,247,0.2)]">
                  <Target className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-purple-400 uppercase text-[10px] tracking-wider block">★ Lead Sourcing Engine</span>
                    <p className="text-[10px] text-foreground/90 font-bold leading-snug">
                      500 monthly sourcing queries + unlimited cache hits
                    </p>
                    <p className="text-[9px] text-muted-foreground font-mono leading-tight">
                      Automated scraping, domain resolution, and MX-verified email harvesting
                    </p>
                  </div>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#ea580c]" />
                  <span>Access all active AI models</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleOpenUpgrade("enterprise")}
              disabled={data.plan === "enterprise"}
              className={`w-full mt-6 py-3 text-xs font-bold uppercase tracking-widest transition-all rounded-none cursor-pointer ${
                data.plan === "enterprise"
                  ? "bg-foreground/5 text-muted-foreground border border-border cursor-default"
                  : "bg-foreground text-background hover:bg-[#ea580c] hover:text-background"
              }`}
            >
              {data.plan === "enterprise" ? "Active Plan" : "Upgrade Plan"}
            </button>
          </div>
        </div>
      </div>

      {/* Subscription request history */}
      <div className="space-y-4">
        <div className="flex items-center gap-4 mb-2">
          <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            // SECTION: Verification logs
          </span>
          <div className="flex-1 border-t border-border" />
          <span className="inline-block h-2 w-2 bg-[#ea580c] animate-blink" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
            02
          </span>
        </div>

        <div className="overflow-x-auto border-2 border-border bg-card rounded-none">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-border text-[9px] font-bold text-muted-foreground uppercase tracking-[0.15em] bg-foreground/[0.02]">
                <th className="p-4 pl-6">Submitted</th>
                <th className="p-4">Upgrade Tier</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Transaction Reference</th>
                <th className="p-4">Receipt Link</th>
                <th className="p-4 pr-6 text-right">Verification Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {data.requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground uppercase tracking-widest text-[10px]">
                    No historical payment proof records located.
                  </td>
                </tr>
              ) : (
                data.requests.map((req) => {
                  const label = PLAN_CONFIGS[req.plan]?.name || req.plan;
                  return (
                    <tr key={req._id} className="hover:bg-foreground/[0.01] transition-colors">
                      <td className="p-4 pl-6 text-muted-foreground font-mono">
                        {new Date(req.createdAt).toLocaleDateString().toUpperCase()}
                      </td>
                      <td className="p-4 font-bold text-foreground uppercase">{label}</td>
                      <td className="p-4 font-bold text-foreground">₹{req.amount}</td>
                      <td className="p-4 font-mono text-muted-foreground select-all">{req.transactionId}</td>
                      <td className="p-4 text-muted-foreground truncate max-w-[150px]" title={req.proofFileName}>
                        {req.proofFileName}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="inline-flex flex-col items-end gap-1">
                          {req.status === "pending" && (
                            <span className="px-2.5 py-0.5 border border-amber-500/30 bg-amber-500/5 text-[9px] font-bold text-amber-500 uppercase tracking-wider inline-flex items-center gap-1.5 rounded-none">
                              <Clock className="w-3 h-3 animate-spin" /> Pending Review
                            </span>
                          )}
                          {req.status === "approved" && (
                            <span className="px-2.5 py-0.5 border border-emerald-400/30 bg-emerald-400/5 text-[9px] font-bold text-emerald-400 uppercase tracking-wider inline-flex items-center gap-1.5 rounded-none">
                              <CheckCircle2 className="w-3 h-3" /> Approved
                            </span>
                          )}
                          {req.status === "rejected" && (
                            <span className="px-2.5 py-0.5 border border-red-500/30 bg-red-500/5 text-[9px] font-bold text-red-400 uppercase tracking-wider inline-flex items-center gap-1.5 rounded-none">
                              <XCircle className="w-3 h-3" /> Rejected
                            </span>
                          )}
                          {req.status === "rejected" && req.adminNotes && (
                            <p className="text-[9px] text-red-400 mt-1 max-w-[200px] text-right font-bold leading-normal border border-red-500/20 bg-red-500/5 px-2 py-1 rounded-none uppercase tracking-wide">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in font-mono">
          <div className="w-full max-w-xl bg-card border-2 border-border p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto rounded-none">
            {/* Close Button */}
            <button
              onClick={() => setSelectedPlan(null)}
              className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground hover:bg-foreground/5 border border-border cursor-pointer transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>

            {submitSuccess ? (
              <div className="py-10 text-center space-y-4">
                <div className="w-12 h-12 border-2 border-emerald-400 bg-emerald-400/5 flex items-center justify-center mx-auto text-emerald-400 rounded-none">
                  <CheckCircle2 className="w-6 h-6 animate-bounce" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Proof Submitted!</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Verification agent will verify reference <strong>{transactionId}</strong> and update quotas shortly.
                </p>
                <div className="pt-4">
                  <button
                    onClick={() => setSelectedPlan(null)}
                    className="px-5 py-3 border-2 border-border text-xs font-bold uppercase tracking-widest hover:border-foreground/20 bg-card cursor-pointer rounded-none"
                  >
                    Close Dialog
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitProof} className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Upgrade to {PLAN_CONFIGS[selectedPlan].name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pay ₹{PLAN_CONFIGS[selectedPlan].price} and submit details below.
                  </p>
                </div>

                {/* Steps Section */}
                <div className="space-y-4 bg-foreground/[0.01] p-4 border-2 border-border rounded-none">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#ea580c]">Checkout Accounts</h4>

                  {fetchingMethods ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 font-bold uppercase tracking-wider">
                      <Activity className="w-4 h-4 animate-spin text-[#ea580c]" />
                      Loading payment channels...
                    </div>
                  ) : paymentMethods.length === 0 ? (
                    <div className="text-xs text-amber-500 bg-amber-500/5 border border-amber-500/20 p-3 rounded-none flex items-center gap-2 font-bold uppercase tracking-wider">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>No active billing routes configured by admin.</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Render UPI ID payment lines */}
                      {paymentMethods.filter((m) => m.type === "upi").map((method) => (
                        <div key={method._id} className="flex items-center justify-between gap-3 text-xs bg-card p-3 border border-border shadow-sm rounded-none">
                          <span className="font-bold text-muted-foreground uppercase tracking-wider">{method.label}:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-foreground bg-foreground/[0.02] px-2.5 py-1 border border-border select-all font-bold">
                              {method.value}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyUpi(method.value)}
                              className="p-1.5 border border-border hover:border-[#ea580c] hover:text-[#ea580c] transition-all bg-card cursor-pointer"
                              title="Copy ID"
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
                          <div key={method._id} className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 border border-border shadow-sm rounded-none">
                            <div className="w-32 h-32 border border-border bg-background overflow-hidden flex items-center justify-center p-1.5 flex-shrink-0 relative">
                              <img
                                src={qrUrl}
                                alt={method.label}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="space-y-1 text-center sm:text-left">
                              <h5 className="font-bold text-xs text-foreground uppercase tracking-wider">{method.label}</h5>
                              <p className="text-[10px] text-muted-foreground leading-relaxed">
                                Scan this QR inside Google Pay, PhonePe, Paytm, or BHIM app to make the transfer of <strong>₹{PLAN_CONFIGS[selectedPlan!].price}</strong>.
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
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Transaction reference / UPI Ref ID</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 618954728913"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-border bg-foreground/[0.01] text-xs focus:border-[#ea580c] focus:outline-none transition-all font-mono rounded-none"
                    />
                  </div>

                  {/* Receipt screenshot upload */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Upload Payment Receipt Screenshot</label>
                    <div
                      onClick={() => !proofFile && document.getElementById("proof-file-input")?.click()}
                      className={`border-2 border-dashed p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[120px] rounded-none ${
                        proofFile
                          ? "border-border bg-foreground/[0.01] cursor-default"
                          : "border-border bg-foreground/[0.01] hover:bg-foreground/[0.02]"
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
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                          <div>
                            <p className="text-xs font-bold text-foreground truncate max-w-[280px]">
                              {proofFile.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 font-bold">
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
                            className="text-[10px] font-bold text-[#ea580c] hover:underline cursor-pointer bg-transparent border-0"
                          >
                            Change File
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 text-muted-foreground">
                          <Upload className="w-5 h-5 mx-auto text-muted-foreground" />
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider">Click to upload screenshot</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG, WEBP, or PDF under 5MB</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {uploadError && (
                  <div className="text-xs text-red-400 bg-red-500/5 border border-red-500/20 p-3 flex items-center gap-2 font-bold uppercase tracking-wider rounded-none">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Submit Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(null)}
                    className="flex-1 py-3 border-2 border-border hover:border-foreground/20 text-xs font-bold uppercase tracking-widest transition-all text-muted-foreground bg-card cursor-pointer rounded-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !proofBase64 || !transactionId.trim() || fetchingMethods}
                    className="flex-1 py-3 bg-foreground text-background hover:bg-[#ea580c] hover:text-background disabled:opacity-50 disabled:hover:bg-foreground disabled:hover:text-background text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer rounded-none"
                  >
                    {submitting ? (
                      <>
                        <Activity className="w-3.5 h-3.5 animate-spin" />
                        Submitting...
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
