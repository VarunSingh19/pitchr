"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Users as UsersIcon,
  Search,
  Activity,
  Mail,
  UserCheck,
  Shield,
  User as UserIcon,
  PenSquare,
  Settings,
  MoreVertical,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SUPPORTED_MODELS } from "@/lib/models-config";

interface UserQuota {
  emailsPerDay: number;
  emailsPerMonth: number;
  maxCampaigns: number;
  allowedModels: string[];
}

interface UserWithStats {
  _id: string;
  name: string;
  email: string;
  image?: string;
  role: "user" | "admin";
  lastLoginAt?: string | null;
  createdAt: string;
  campaignCount: number;
  emailsSent: number;
  emailsBounced: number;
  isActive: boolean;
  quotas: UserQuota;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Edit Quotas Modal state
  const [editingUser, setEditingUser] = useState<UserWithStats | null>(null);
  const [editEmailsPerDay, setEditEmailsPerDay] = useState(100);
  const [editEmailsPerMonth, setEditEmailsPerMonth] = useState(2000);
  const [editMaxCampaigns, setEditMaxCampaigns] = useState(10);
  const [editAllowedModels, setEditAllowedModels] = useState<string[]>([]);
  const [savingQuotas, setSavingQuotas] = useState(false);

  // Custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmLabel?: string;
    isDestructive?: boolean;
  } | null>(null);

  // Custom alert modal/toast state
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const [mounted, setMounted] = useState(false);
  const [activeModels, setActiveModels] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setActiveModels(data.activeModels || []);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle role modification
  const handleToggleRole = async (userId: string, currentRole: "user" | "admin") => {
    const actionText = currentRole === "admin" ? "Demote" : "Promote";
    setConfirmModal({
      isOpen: true,
      title: `${actionText} User`,
      message: `Are you sure you want to change this user's role to ${
        currentRole === "admin" ? "User" : "Admin"
      }?`,
      confirmLabel: actionText,
      isDestructive: currentRole === "admin",
      onConfirm: async () => {
        setUpdatingUserId(userId);
        try {
          const newRole = currentRole === "admin" ? "user" : "admin";
          const res = await fetch("/api/admin/users", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, role: newRole }),
          });
          if (res.ok) {
            await fetchUsers();
            setAlertModal({
              isOpen: true,
              title: "Role Updated",
              message: `User's role successfully updated to ${newRole === "admin" ? "Admin" : "User"}.`,
              type: "success"
            });
          } else {
            const err = await res.json().catch(() => ({}));
            setAlertModal({
              isOpen: true,
              title: "Update Failed",
              message: err.error || "Failed to update role.",
              type: "error"
            });
          }
        } catch {
          setAlertModal({
            isOpen: true,
            title: "Network Error",
            message: "Failed to update role due to connection issues.",
            type: "error"
          });
        } finally {
          setUpdatingUserId(null);
        }
      }
    });
  };

  // Trigger impersonation
  const handleImpersonate = async (userId: string, userEmail: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Impersonate User",
      message: `Switch session and impersonate ${userEmail}?`,
      confirmLabel: "Impersonate",
      isDestructive: false,
      onConfirm: async () => {
        setUpdatingUserId(userId);
        try {
          const res = await fetch("/api/admin/impersonate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          });
          if (res.ok) {
            window.location.href = "/dashboard";
          } else {
            const err = await res.json().catch(() => ({}));
            setAlertModal({
              isOpen: true,
              title: "Impersonation Failed",
              message: err.error || "Failed to start impersonation.",
              type: "error"
            });
          }
        } catch {
          setAlertModal({
            isOpen: true,
            title: "Network Error",
            message: "Failed to start impersonation due to connection issues.",
            type: "error"
          });
        } finally {
          setUpdatingUserId(null);
        }
      }
    });
  };

  // Open Quotas Editor Modal
  const openQuotasModal = (user: UserWithStats) => {
    setEditingUser(user);
    setEditEmailsPerDay(user.quotas?.emailsPerDay ?? 100);
    setEditEmailsPerMonth(user.quotas?.emailsPerMonth ?? 2000);
    setEditMaxCampaigns(user.quotas?.maxCampaigns ?? 10);
    
    const userModels = user.quotas?.allowedModels ?? [];
    const hasOverlap = userModels.some((m) => activeModels.includes(m));
    if (hasOverlap) {
      setEditAllowedModels(userModels);
    } else {
      setEditAllowedModels(activeModels);
    }
  };

  // Save Quotas modification
  const handleSaveQuotas = async () => {
    if (!editingUser) return;

    setSavingQuotas(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUser._id,
          quotas: {
            emailsPerDay: editEmailsPerDay,
            emailsPerMonth: editEmailsPerMonth,
            maxCampaigns: editMaxCampaigns,
            allowedModels: editAllowedModels,
          },
        }),
      });
      if (res.ok) {
        setEditingUser(null);
        await fetchUsers();
        setAlertModal({
          isOpen: true,
          title: "Quotas Saved",
          message: "User limits successfully updated and persisted.",
          type: "success"
        });
      } else {
        const err = await res.json().catch(() => ({}));
        setAlertModal({
          isOpen: true,
          title: "Update Failed",
          message: err.error || "Failed to save quotas.",
          type: "error"
        });
      }
    } catch {
      setAlertModal({
        isOpen: true,
        title: "Network Error",
        message: "Failed to save quotas due to connection issues.",
        type: "error"
      });
    } finally {
      setSavingQuotas(false);
    }
  };

  // Toggle allowed model selection in modal
  const handleToggleModel = (modelId: string) => {
    setEditAllowedModels((prev) =>
      prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]
    );
  };

  // Filtered users calculation
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" || (statusFilter === "active" ? user.isActive : !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Aggregate stats
  const totalUsersCount = users.length;
  const activeUsersCount = users.filter((u) => u.isActive).length;
  const totalEmailsSent = users.reduce((sum, u) => sum + u.emailsSent, 0);

  const statsCards = [
    {
      label: "Total Users",
      value: totalUsersCount,
      icon: UsersIcon,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      desc: "Registered accounts in database",
    },
    {
      label: "Active Users",
      value: activeUsersCount,
      icon: Activity,
      color: "text-green-400",
      bg: "bg-green-500/10",
      desc: "Logged in or active in last 30 days",
    },
    {
      label: "Total Sent Emails",
      value: totalEmailsSent,
      icon: Mail,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      desc: "Delivered cold emails overall",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">User Management</h1>
          <p className="text-text-secondary text-sm">
            Monitor registered users, manage sending quotas, and audit dashboard activities
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-3 gap-4">
        {statsCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-border-default bg-bg-surface p-5 hover:scale-[1.01] hover:shadow-lg hover:shadow-black/5 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  card.bg
                )}
              >
                <card.icon className={cn("w-5 h-5", card.color)} />
              </div>
            </div>
            <p className="text-3xl font-extrabold tracking-tight">
              {loading ? "—" : card.value}
            </p>
            <p className="text-xs font-semibold text-text-muted mt-1">{card.label}</p>
            <p className="text-[10px] text-text-faint mt-0.5">{card.desc}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-bg-surface border border-border-default p-4 rounded-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-base border border-border-default focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-text-faint"
          />
        </div>
        <div className="flex flex-wrap gap-2.5">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="bg-bg-base border border-border-default rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none cursor-pointer focus:border-orange-500/50 hover:bg-bg-elevated transition-colors"
          >
            <option value="all">All Roles</option>
            <option value="user">Users</option>
            <option value="admin">Admins</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-bg-base border border-border-default rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none cursor-pointer focus:border-orange-500/50 hover:bg-bg-elevated transition-colors"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-text-muted">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500 mr-2" />
          <span>Fetching user registry...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-2xl border border-border-default bg-bg-surface p-16 text-center">
          <UsersIcon className="w-12 h-12 text-text-faint mx-auto mb-3" />
          <p className="text-sm font-medium text-text-secondary">No users matched your criteria</p>
          <p className="text-xs text-text-faint mt-1">Try relaxing filters or search terms</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border-default bg-bg-surface">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-default text-xs font-semibold text-text-muted bg-bg-base/40">
                <th className="p-4 pl-6">User Details</th>
                <th className="p-4">Role</th>
                <th className="p-4">Campaigns</th>
                <th className="p-4">Emails Sent</th>
                <th className="p-4">Quotas</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default text-sm">
              {filteredUsers.map((user) => (
                <tr
                  key={user._id}
                  className="hover:bg-bg-base/20 transition-colors group"
                >
                  {/* Name and avatar */}
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name}
                          className="w-9 h-9 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-bg-elevated border border-border-default flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-text-muted" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-text-primary group-hover:text-orange-400 transition-colors">
                          {user.name}
                        </p>
                        <p className="text-xs text-text-faint font-mono mt-0.5">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="p-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                        user.role === "admin"
                          ? "text-orange-400 bg-orange-500/10 border border-orange-500/20"
                          : "text-text-muted bg-bg-elevated border border-border-default"
                      )}
                    >
                      {user.role === "admin" && <Shield className="w-3 h-3" />}
                      {user.role}
                    </span>
                  </td>

                  {/* Campaign Count */}
                  <td className="p-4 font-medium text-text-secondary">
                    {user.campaignCount}
                  </td>

                  {/* Emails Count */}
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 font-medium text-text-secondary">
                      <span>{user.emailsSent}</span>
                      {user.emailsBounced > 0 && (
                        <span className="text-[10px] font-normal text-error bg-error-dim px-1.5 py-0.5 rounded-md">
                          {user.emailsBounced} bounced
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Quotas Details */}
                  <td className="p-4 text-xs text-text-faint space-y-0.5">
                    <p>Campaigns: <span className="font-medium text-text-muted">{user.quotas?.maxCampaigns ?? 10}</span></p>
                    <p>Daily limit: <span className="font-medium text-text-muted">{user.quotas?.emailsPerDay ?? 100}</span></p>
                  </td>

                  {/* Status / Activity badge */}
                  <td className="p-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                        user.isActive
                          ? "text-green-400 bg-green-500/10"
                          : "text-text-faint bg-bg-base/40"
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          user.isActive ? "bg-green-400 animate-pulse" : "bg-text-faint"
                        )}
                      />
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                    <p className="text-[10px] text-text-faint mt-1 font-mono">
                      {user.lastLoginAt
                        ? `Login: ${new Date(user.lastLoginAt).toLocaleDateString()}`
                        : "Never logged in"}
                    </p>
                  </td>

                  {/* Actions */}
                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openQuotasModal(user)}
                        disabled={updatingUserId === user._id}
                        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-all"
                        title="Configure Quotas"
                      >
                        <Settings className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleToggleRole(user._id, user.role)}
                        disabled={updatingUserId === user._id}
                        className="p-1.5 rounded-lg text-text-muted hover:text-orange-400 hover:bg-orange-500/10 transition-all text-xs font-semibold"
                        title="Toggle Admin/User"
                      >
                        {user.role === "admin" ? "Demote" : "Promote"}
                      </button>

                      {user.role !== "admin" && (
                        <button
                          onClick={() => handleImpersonate(user._id, user.email)}
                          disabled={updatingUserId === user._id}
                          className="px-2.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold tracking-wide transition-all shadow-sm hover:shadow-orange-500/15"
                          title="Impersonate User"
                        >
                          {updatingUserId === user._id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            "Impersonate"
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quotas Editor Modal */}
      {editingUser && mounted && createPortal(
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-bg-surface border border-border-default rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border-default">
              <div>
                <h3 className="text-lg font-bold text-text-primary">Configure User Quotas</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Modifying tier limits for {editingUser.email}
                </p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-xl hover:bg-bg-elevated text-text-faint hover:text-text-muted transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                {/* Max Campaigns */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-muted">Max Campaigns</label>
                  <input
                    type="number"
                    min={1}
                    value={editMaxCampaigns}
                    onChange={(e) => setEditMaxCampaigns(Number(e.target.value))}
                    className="w-full bg-bg-base border border-border-default focus:border-orange-500/50 rounded-xl px-3.5 py-2 text-sm outline-none font-medium transition-colors"
                  />
                </div>

                {/* Daily Email Limits */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-muted">Emails Per Day</label>
                  <input
                    type="number"
                    min={0}
                    value={editEmailsPerDay}
                    onChange={(e) => setEditEmailsPerDay(Number(e.target.value))}
                    className="w-full bg-bg-base border border-border-default focus:border-orange-500/50 rounded-xl px-3.5 py-2 text-sm outline-none font-medium transition-colors"
                  />
                </div>
              </div>

              {/* Monthly Email Limits */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted">Emails Per Month</label>
                <input
                  type="number"
                  min={0}
                  value={editEmailsPerMonth}
                  onChange={(e) => setEditEmailsPerMonth(Number(e.target.value))}
                  className="w-full bg-bg-base border border-border-default focus:border-orange-500/50 rounded-xl px-3.5 py-2 text-sm outline-none font-medium transition-colors"
                />
              </div>

              {/* Whitelisted Models Checklist */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-muted">Whitelisted AI Models</label>
                <div className="border border-border-default rounded-2xl bg-bg-base p-4 space-y-2">
                  {(() => {
                    const visibleModelIds = Array.from(
                      new Set([...activeModels, ...editAllowedModels])
                    );
                    const modelsToDisplay = visibleModelIds.map((modelId) => {
                      const config = SUPPORTED_MODELS.find((m) => m.id === modelId);
                      const isActive = activeModels.includes(modelId);
                      return {
                        id: modelId,
                        name: config?.name || modelId,
                        description: config?.description || `Custom model configured via system key (${modelId.split("/")[0] || "custom"})`,
                        isActive,
                      };
                    });

                    if (modelsToDisplay.length === 0) {
                      return (
                        <div className="text-center py-4 text-xs text-text-faint">
                          No active models found in system settings. Please configure System API Keys first.
                        </div>
                      );
                    }

                    return modelsToDisplay.map((model) => {
                      const isChecked = editAllowedModels.includes(model.id);
                      return (
                        <label
                          key={model.id}
                          className={cn(
                            "flex items-start gap-3 p-2.5 rounded-xl border border-transparent cursor-pointer transition-colors hover:bg-bg-elevated",
                            isChecked && "bg-bg-surface border-border-default"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleModel(model.id)}
                            className="mt-1 accent-orange-500 cursor-pointer h-4 w-4 rounded-md"
                          />
                          <div className="text-left flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-text-muted">{model.name}</p>
                              {!model.isActive && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                                  Inactive
                                </span>
                              )}
                              {model.isActive && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-text-faint mt-0.5">{model.description}</p>
                          </div>
                        </label>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-border-default bg-bg-base/40">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 border border-border-default hover:bg-bg-elevated rounded-xl text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuotas}
                disabled={savingQuotas}
                className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-orange-500/10 active:scale-[0.98]"
              >
                {savingQuotas ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Quotas</span>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Custom Confirmation Modal ── */}
      {confirmModal?.isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-bg-surface border border-border-default rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  confirmModal.isDestructive ? "bg-red-500/10 text-red-500" : "bg-orange-500/10 text-orange-400"
                )}>
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-text-primary">{confirmModal.title}</h3>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-border-default bg-bg-base/40">
              <button
                onClick={() => setConfirmModal(prev => prev ? { ...prev, isOpen: false } : null)}
                className="px-4 py-2 border border-border-default hover:bg-bg-elevated rounded-xl text-xs font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const onConfirm = confirmModal.onConfirm;
                  setConfirmModal(prev => prev ? { ...prev, isOpen: false } : null);
                  await onConfirm();
                }}
                className={cn(
                  "px-5 py-2 rounded-xl text-xs font-semibold transition-all shadow-md active:scale-[0.98]",
                  confirmModal.isDestructive
                    ? "bg-red-500 hover:bg-red-400 text-white shadow-red-500/10"
                    : "bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/10"
                )}
              >
                {confirmModal.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Custom Alert Modal ── */}
      {alertModal?.isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-bg-surface border border-border-default rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-in">
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto flex items-center justify-center">
                {alertModal.type === "success" && (
                  <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                )}
                {alertModal.type === "error" && (
                  <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 animate-pulse" />
                  </div>
                )}
                {alertModal.type === "info" && (
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-text-primary">{alertModal.title}</h3>
                <p className="text-xs text-text-secondary leading-relaxed">{alertModal.message}</p>
              </div>
            </div>
            <div className="flex items-center justify-center p-4 border-t border-border-default bg-bg-base/40">
              <button
                onClick={() => setAlertModal(prev => prev ? { ...prev, isOpen: false } : null)}
                className="w-full py-2 bg-bg-elevated hover:bg-bg-base border border-border-default rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
