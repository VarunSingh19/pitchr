"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Sliders,
  Plus,
  Trash2,
  Power,
  PowerOff,
  Activity,
  AlertCircle,
  Check,
  Upload,
  ArrowRight,
  User as UserIcon,
} from "lucide-react";
import { PLAN_CONFIGS } from "@/lib/quota-config";

interface SubscriptionRequest {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  } | null;
  plan: "starter" | "pro" | "enterprise";
  amount: number;
  transactionId: string;
  proofFilePath: string;
  proofFileName: string;
  status: "pending" | "approved" | "rejected";
  adminNotes?: string;
  createdAt: string;
}

interface PaymentMethod {
  _id: string;
  type: "upi" | "qr_code";
  label: string;
  value: string;
  isActive: boolean;
}

export default function AdminSubscriptionsPage() {
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal Review state
  const [activeRequest, setActiveRequest] = useState<SubscriptionRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // New payment method state
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [newMethodType, setNewMethodType] = useState<"upi" | "qr_code">("upi");
  const [newMethodLabel, setNewMethodLabel] = useState("");
  const [newMethodValue, setNewMethodValue] = useState(""); // UPI ID or QR image base64
  const [newMethodFile, setNewMethodFile] = useState<File | null>(null);
  const [addMethodError, setAddMethodError] = useState("");
  const [addingMethod, setAddingMethod] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/subscription-requests");
      if (!res.ok) throw new Error("Failed to load subscription requests");
      const json = await res.json();
      setRequests(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }, []);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/payment-methods");
      if (!res.ok) throw new Error("Failed to load payment methods");
      const json = await res.json();
      setPaymentMethods(json);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const initData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchRequests(), fetchPaymentMethods()]);
    setLoading(false);
  }, [fetchRequests, fetchPaymentMethods]);

  useEffect(() => {
    initData();
  }, [initData]);

  const handleVerifyRequest = async (status: "approved" | "rejected") => {
    if (!activeRequest) return;

    setVerifying(true);
    setVerifyError("");

    try {
      const res = await fetch(`/api/admin/subscription-requests/${activeRequest._id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes }),
      });

      if (res.ok) {
        setActiveRequest(null);
        setAdminNotes("");
        fetchRequests();
      } else {
        const errData = await res.json().catch(() => ({}));
        setVerifyError(errData.error || "Failed to verify transaction");
      }
    } catch (err) {
      setVerifyError("Network error — try again");
    } finally {
      setVerifying(false);
    }
  };

  const handleToggleMethod = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch("/api/admin/payment-methods", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentActive }),
      });
      if (res.ok) {
        fetchPaymentMethods();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMethod = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payment method? This cannot be undone.")) return;

    try {
      const res = await fetch("/api/admin/payment-methods", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        fetchPaymentMethods();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleQRFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAddMethodError("Please upload a valid image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAddMethodError("QR Image must be under 2MB");
      return;
    }

    setNewMethodFile(file);
    setAddMethodError("");

    const reader = new FileReader();
    reader.onload = () => {
      setNewMethodValue(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();

    const val = newMethodType === "upi" ? newMethodValue.trim() : newMethodValue;
    if (!newMethodLabel.trim() || !val) {
      setAddMethodError("All fields are required");
      return;
    }

    setAddingMethod(true);
    setAddMethodError("");

    try {
      const res = await fetch("/api/admin/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newMethodType,
          label: newMethodLabel.trim(),
          value: val,
        }),
      });

      if (res.ok) {
        setShowAddMethod(false);
        setNewMethodLabel("");
        setNewMethodValue("");
        setNewMethodFile(null);
        fetchPaymentMethods();
      } else {
        const errData = await res.json().catch(() => ({}));
        setAddMethodError(errData.error || "Failed to save payment method");
      }
    } catch (err) {
      setAddMethodError("Network error — try again");
    } finally {
      setAddingMethod(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <Activity className="w-10 h-10 animate-spin text-orange-500" />
        <p className="text-sm font-semibold text-text-muted">Loading subscriptions manager...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 bg-bg-surface rounded-3xl border border-border-default space-y-4 max-w-xl mx-auto">
        <AlertCircle className="w-12 h-12 text-error mx-auto animate-pulse" />
        <h3 className="text-lg font-bold">Failed to Load Subscriptions</h3>
        <p className="text-text-secondary text-sm">{error}</p>
        <button
          onClick={() => initData()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-sm font-semibold transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const processedRequests = requests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-8 animate-fade-in text-text-primary">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Subscriptions & Manual Payments</h1>
          <p className="text-sm text-text-secondary">
            Verify transaction screenshots, approve/reject upgrades, and manage UPI QR routes.
          </p>
        </div>
      </div>

      {/* Grid: Pending receipts and Payment accounts */}
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left: Pending verification desk */}
        <div className="lg:col-span-8 space-y-4">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-400" /> Pending Receipts Box ({pendingRequests.length})
          </h3>

          <div className="overflow-x-auto rounded-3xl border border-border-default bg-bg-surface shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-default text-xs font-semibold text-text-muted bg-bg-base/40">
                  <th className="p-4 pl-6">Submitted</th>
                  <th className="p-4">User</th>
                  <th className="p-4">Requested Plan</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Txn ID</th>
                  <th className="p-4 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default text-xs">
                {pendingRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-text-faint font-medium">
                      All payment proofs are verified! Inbox is clear.
                    </td>
                  </tr>
                ) : (
                  pendingRequests.map((req) => {
                    const label = PLAN_CONFIGS[req.plan]?.name || req.plan;
                    return (
                      <tr key={req._id} className="hover:bg-bg-base/20 transition-colors">
                        <td className="p-4 pl-6 text-text-muted">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-text-primary">{req.userId?.name || "Deleted User"}</p>
                          <p className="text-[10px] text-text-faint">{req.userId?.email}</p>
                        </td>
                        <td className="p-4 font-bold text-orange-400">{label}</td>
                        <td className="p-4 font-mono font-semibold">₹{req.amount}</td>
                        <td className="p-4 font-mono text-text-secondary select-all">{req.transactionId}</td>
                        <td className="p-4 pr-6 text-right">
                          <button
                            onClick={() => {
                              setActiveRequest(req);
                              setAdminNotes("");
                              setVerifyError("");
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-white rounded-lg font-semibold shadow-sm transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Review</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Payment accounts settings */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-orange-400" /> Payment Routes
            </h3>
            <button
              onClick={() => {
                setShowAddMethod(true);
                setAddMethodError("");
                setNewMethodLabel("");
                setNewMethodValue("");
                setNewMethodFile(null);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="space-y-3">
            {paymentMethods.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border-default bg-bg-surface/50 p-6 text-center text-xs text-text-faint">
                No active payment channels configured. Add one to let users check out.
              </div>
            ) : (
              paymentMethods.map((method) => {
                const isQR = method.type === "qr_code";
                return (
                  <div
                    key={method._id}
                    className={`rounded-2xl border bg-bg-surface p-4 flex items-start justify-between gap-3 shadow-sm transition-all ${
                      method.isActive ? "border-border-default" : "border-dashed border-border-default/50 opacity-60"
                    }`}
                  >
                    <div className="space-y-2 min-w-0 flex-1">
                      <div>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-bg-elevated text-text-muted border border-border-default tracking-wider">
                          {method.type === "upi" ? "UPI ID" : "QR IMAGE"}
                        </span>
                        <h4 className="font-semibold text-xs text-text-primary mt-1 truncate">{method.label}</h4>
                      </div>

                      {isQR ? (
                        <div className="w-16 h-16 rounded border border-border-default overflow-hidden bg-bg-base p-1 relative group">
                          <img
                            src={`/api/payment-qr/${method.value.split("/").pop()}`}
                            alt={method.label}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <p className="font-mono text-xs text-text-secondary truncate select-all">{method.value}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => handleToggleMethod(method._id, method.isActive)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          method.isActive
                            ? "border-green-500/20 bg-green-500/5 hover:bg-green-500/10 text-green-400"
                            : "border-border-default hover:bg-bg-elevated text-text-faint hover:text-text-muted"
                        }`}
                        title={method.isActive ? "Disable payment gateway" : "Enable payment gateway"}
                      >
                        {method.isActive ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDeleteMethod(method._id)}
                        className="p-1.5 rounded-lg border border-border-default hover:border-error/25 hover:bg-error-dim text-text-faint hover:text-error transition-all"
                        title="Delete gateway"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom section: Log of processed upgrade records */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Processed Verification Audit History</h3>
        <div className="overflow-x-auto rounded-3xl border border-border-default bg-bg-surface shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-default text-xs font-semibold text-text-muted bg-bg-base/40">
                <th className="p-4 pl-6">Submitted Date</th>
                <th className="p-4">User</th>
                <th className="p-4">Plan Tier</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Transaction ID</th>
                <th className="p-4">Audit Result</th>
                <th className="p-4 pr-6 text-right">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default text-xs">
              {processedRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-text-faint">
                    No processed history logs.
                  </td>
                </tr>
              ) : (
                processedRequests.map((req) => {
                  const label = PLAN_CONFIGS[req.plan]?.name || req.plan;
                  return (
                    <tr key={req._id} className="hover:bg-bg-base/20 transition-colors">
                      <td className="p-4 pl-6 text-text-muted">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-text-primary">{req.userId?.name || "Deleted User"}</p>
                        <p className="text-[10px] text-text-faint">{req.userId?.email}</p>
                      </td>
                      <td className="p-4 font-bold text-text-primary">{label}</td>
                      <td className="p-4 font-mono font-semibold">₹{req.amount}</td>
                      <td className="p-4 font-mono text-text-secondary select-all">{req.transactionId}</td>
                      <td className="p-4">
                        {req.status === "approved" ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 inline-flex items-center gap-1">
                            Approved
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 inline-flex items-center gap-1">
                            Rejected
                          </span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right text-text-muted max-w-[200px] truncate" title={req.adminNotes}>
                        {req.adminNotes || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Upgrade Review Drawer */}
      {activeRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-base/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-bg-surface border border-border-default rounded-3xl p-6 shadow-xl relative animate-scale-in max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setActiveRequest(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-text-faint hover:text-text-muted hover:bg-bg-elevated transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Left: receipt zoom viewer */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Receipt Proof file</h4>
                <div className="w-full aspect-[3/4] rounded-2xl border border-border-default bg-bg-base p-2 overflow-hidden flex items-center justify-center relative group">
                  <img
                    src={`/api/admin/payment-proofs/${activeRequest.proofFilePath.split("/").pop()}`}
                    alt="Receipt payment proof screenshot"
                    className="w-full h-full object-contain cursor-zoom-in"
                    onClick={() => {
                      // Open screenshot in new tab
                      window.open(`/api/admin/payment-proofs/${activeRequest.proofFilePath.split("/").pop()}`, "_blank");
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none text-white text-xs font-semibold rounded-2xl">
                    Click to inspect in new tab
                  </div>
                </div>
                <p className="text-[10px] text-text-faint text-center break-all">{activeRequest.proofFileName}</p>
              </div>

              {/* Right: details and action controls */}
              <div className="space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold">Review Upgrade Receipt</h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      Verify the details match the payment receipt screenshot.
                    </p>
                  </div>

                  <div className="space-y-2 text-xs bg-bg-base/45 p-4 rounded-2xl border border-border-default/50">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Applicant:</span>
                      <span className="font-semibold text-text-primary">{activeRequest.userId?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Email:</span>
                      <span className="font-semibold text-text-primary select-all">{activeRequest.userId?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Requested Plan:</span>
                      <span className="font-bold text-orange-400">{PLAN_CONFIGS[activeRequest.plan]?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Expected Price:</span>
                      <span className="font-mono font-bold text-text-primary">₹{activeRequest.amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Transaction ID:</span>
                      <span className="font-mono font-bold text-text-primary select-all">{activeRequest.transactionId}</span>
                    </div>
                  </div>

                  {/* Feedback Notes */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-secondary">Verification remarks (Shown on rejection)</label>
                    <textarea
                      placeholder="e.g. Transaction matching expected amount confirmed, or Transaction reference incorrect..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-border-default bg-bg-elevated text-text-primary placeholder:text-text-faint focus:border-accent-primary focus:ring-1 focus:ring-accent-primary outline-none transition-all resize-none"
                    />
                  </div>
                </div>

                {verifyError && (
                  <div className="text-xs text-error bg-error-dim border border-error/20 p-3 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{verifyError}</span>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => handleVerifyRequest("rejected")}
                    disabled={verifying}
                    className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 active:scale-[0.98]"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerifyRequest("approved")}
                    disabled={verifying}
                    className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/10 transition-all flex items-center justify-center gap-1 active:scale-[0.98]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve & Upgrade</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add payment method modal */}
      {showAddMethod && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-base/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-bg-surface border border-border-default rounded-3xl p-6 shadow-xl relative animate-scale-in">
            <button
              onClick={() => setShowAddMethod(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-text-faint hover:text-text-muted hover:bg-bg-elevated transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <form onSubmit={handleAddPaymentMethod} className="space-y-5">
              <div>
                <h3 className="text-base font-bold">Add Payment Route</h3>
                <p className="text-xs text-text-muted mt-0.5">Configure a new active checkout gateway for upgrades.</p>
              </div>

              {/* Type Select */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Gateway Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewMethodType("upi");
                      setNewMethodValue("");
                      setNewMethodFile(null);
                    }}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      newMethodType === "upi"
                        ? "border-orange-500 bg-orange-500/10 text-orange-400"
                        : "border-border-default hover:bg-bg-elevated text-text-secondary"
                    }`}
                  >
                    UPI ID Account
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewMethodType("qr_code");
                      setNewMethodValue("");
                      setNewMethodFile(null);
                    }}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      newMethodType === "qr_code"
                        ? "border-orange-500 bg-orange-500/10 text-orange-400"
                        : "border-border-default hover:bg-bg-elevated text-text-secondary"
                    }`}
                  >
                    Scan QR Code
                  </button>
                </div>
              </div>

              {/* Label */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Display Name / Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Primary GPay UPI Account, Scan & Pay Paytm QR"
                  value={newMethodLabel}
                  onChange={(e) => setNewMethodLabel(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-border-default bg-bg-elevated text-text-primary focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all font-medium"
                />
              </div>

              {/* Value / file input */}
              {newMethodType === "upi" ? (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">UPI ID string</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. varun@okaxis"
                    value={newMethodValue}
                    onChange={(e) => setNewMethodValue(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-border-default bg-bg-elevated text-text-primary focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all font-mono font-semibold"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">Upload QR image</label>
                  <div
                    onClick={() => !newMethodFile && document.getElementById("qr-file-input")?.click()}
                    className={`rounded-xl border-2 border-dashed p-4 text-center cursor-pointer flex flex-col items-center justify-center min-h-[100px] ${
                      newMethodFile
                        ? "border-border-subtle bg-bg-surface cursor-default"
                        : "border-border-default bg-bg-elevated hover:border-border-subtle"
                    }`}
                  >
                    <input
                      id="qr-file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleQRFileChange}
                      className="hidden"
                    />

                    {newMethodFile ? (
                      <div className="space-y-1">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                        <p className="text-xs font-medium text-text-primary truncate max-w-[240px]">
                          {newMethodFile.name}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewMethodFile(null);
                            setNewMethodValue("");
                          }}
                          className="text-[9px] font-bold text-text-faint hover:text-error transition-colors underline"
                        >
                          Change QR
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5 text-text-muted">
                        <Upload className="w-4 h-4 mx-auto text-text-faint" />
                        <p className="text-[10px] font-medium">Click to upload QR image</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {addMethodError && (
                <div className="text-xs text-error bg-error-dim border border-error/20 p-2.5 rounded-xl flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{addMethodError}</span>
                </div>
              )}

              {/* Submit / Cancel Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMethod(false)}
                  className="flex-1 py-2.5 border border-border-default hover:bg-bg-elevated rounded-xl text-xs font-bold transition-all text-text-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMethod || !newMethodLabel.trim() || !newMethodValue}
                  className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/10 flex items-center justify-center gap-1 active:scale-[0.98]"
                >
                  {addingMethod ? (
                    <>
                      <Activity className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <span>Save Gateway</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
