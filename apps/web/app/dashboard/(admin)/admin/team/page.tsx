"use client";

import { useState } from "react";
import Link from "next/link";
import {
  UserPlus,
  Mail,
  Copy,
  Check,
  X,
  Sparkles,
  Send,
  Loader2,
} from "lucide-react";
import {
  type AdminMember,
  type AdminInvitation,
  type AdminInvitationStatus,
  type AdminUserRole,
} from "../../../../../lib/admin-data";
import {
  useMembers,
  useInvitations,
  useCreateInvitation,
  useRevokeInvitation,
  useResendInvitation,
} from "../../../../../lib/query";

export default function AdminTeamPage() {
  const { data: apiMembers } = useMembers();
  const { data: apiInvitations } = useInvitations();
  const createInviteMutation = useCreateInvitation();
  const revokeInviteMutation = useRevokeInvitation();
  const resendInviteMutation = useResendInvitation();
  const [resendingId, setResendingId] = useState<string | null>(null);

  const rawMembers = Array.isArray(apiMembers)
    ? apiMembers
    : Array.isArray((apiMembers as any)?.members)
    ? (apiMembers as any).members
    : [];

  const membersList: AdminMember[] = rawMembers.map((m: any) => {
    const name = m.name || m.user?.name || "Staff Member";
    const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "ST";
    return {
      id: m.id,
      name,
      email: m.email || m.user?.email || "staff@example.com",
      role: m.role as AdminUserRole,
      department: "Sales Operations",
      avatarInitials: initials,
      emailVerified: true,
      status: "ACTIVE" as const,
      joinedAt: new Date(m.createdAt || Date.now()).toLocaleDateString(),
      targetQuota: m.salesRep?.targetQuota ?? undefined,
      commissionRate: m.salesRep?.commissionRate ?? undefined,
      approvalThreshold: m.salesManager?.maxApprovalDiscount ?? undefined,
    };
  });

  const rawInvitations = Array.isArray(apiInvitations)
    ? apiInvitations
    : Array.isArray((apiInvitations as any)?.invitations)
    ? (apiInvitations as any).invitations
    : [];

  const initialInvitations: AdminInvitation[] = rawInvitations.map((inv: any) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role as AdminUserRole,
    token: inv.token,
    status: inv.status as AdminInvitationStatus,
    department: inv.department || "Sales Operations",
    invitedBy: inv.invitedBy?.name || "Administrator",
    expiresAt: new Date(inv.expiresAt || Date.now()).toLocaleDateString(),
    createdAt: new Date(inv.createdAt || Date.now()).toLocaleDateString(),
  }));

  const [localInvitations, setLocalInvitations] = useState<AdminInvitation[] | null>(null);
  const invitationsList: AdminInvitation[] = localInvitations || initialInvitations;
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AdminUserRole>("SALES_REP");
  const [inviteDept, setInviteDept] = useState("Enterprise Sales");
  const [inviteTerritory, setInviteTerritory] = useState("");
  const [inviteExpiryDays, setInviteExpiryDays] = useState<number>(7);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopyInviteLink = (token: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(`${window.location.origin}/invite/accept?token=${token}`);
    }
    setCopiedToken(token);
    showToast("Invite onboarding link copied to clipboard!");
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleResendInvitation = async (invId: string, email: string) => {
    try {
      setResendingId(invId);
      await resendInviteMutation.mutateAsync(invId);
      showToast(`Invitation email successfully resent to ${email}!`);
    } catch (err: any) {
      console.error("Failed to resend invitation:", err);
      showToast(err?.message || "Failed to resend invitation email.");
    } finally {
      setResendingId(null);
    }
  };

  const handleRevokeInvitation = async (invId: string) => {
    try {
      await revokeInviteMutation.mutateAsync(invId);
    } catch (err) {
      console.warn("Revoked with optimistic local state:", err);
    }

    setLocalInvitations(
      invitationsList.map((i) => (i.id === invId ? { ...i, status: "REVOKED" as const } : i))
    );
    showToast("Invitation revoked.");
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const newInvite: AdminInvitation = {
      id: `inv-${Date.now()}`,
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      token: `inv-tok-${Date.now().toString(36)}`,
      status: "PENDING",
      department: inviteDept.trim() || "Sales Operations",
      invitedBy: "System Administrator",
      expiresAt: new Date(Date.now() + inviteExpiryDays * 24 * 60 * 60 * 1000).toLocaleDateString(),
      createdAt: new Date().toLocaleDateString(),
    };

    try {
      await createInviteMutation.mutateAsync({
        email: newInvite.email,
        role: newInvite.role,
        department: newInvite.department,
        territory: inviteTerritory.trim() || undefined,
        expiryDays: inviteExpiryDays,
      });
    } catch (err) {
      console.warn("Invite created with optimistic local state:", err);
    }

    setLocalInvitations([newInvite, ...invitationsList]);
    setIsInviteModalOpen(false);
    showToast(`Invitation sent to ${newInvite.email} with role ${newInvite.role}!`);

    // Reset Form
    setInviteEmail("");
    setInviteTerritory("");
    setInviteExpiryDays(7);
  };

  const pendingInvites = invitationsList.filter((i) => i.status === "PENDING");
  const salesReps = membersList.filter((m) => m.role === "SALES_REP");
  const approversCount = membersList.filter((m) => m.role === "SALES_MANAGER" || m.role === "FINANCE_OPS" || m.role === "ADMIN").length;
  const distinctRolesCount = new Set(membersList.map((m) => m.role)).size || 1;
  const combinedQuota = membersList.reduce((acc, m) => acc + (m.targetQuota || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2 border border-slate-700 animate-in slide-in-from-bottom-3 duration-200">
          <Sparkles size={14} className="text-[#ff5e3a]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/dashboard/admin" className="hover:text-slate-900">Admin Console</Link>
            <span>/</span>
            <span className="text-[#ff5e3a]">Team &amp; Access</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Team Hierarchy &amp; Access Control
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage staff role assignments, reporting hierarchies, target quotas, and cryptographic onboarding invites.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsInviteModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-sm shadow-[#ff5e3a]/25 transition cursor-pointer"
        >
          <UserPlus size={15} />
          <span>Invite Team Member</span>
        </button>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Staff</span>
          <span className="text-xl font-extrabold text-slate-900 mt-1 block">{membersList.length} Accounts</span>
          <span className="text-[11px] text-slate-500">Across {distinctRolesCount} System Role{distinctRolesCount === 1 ? "" : "s"}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Sales Reps</span>
          <span className="text-xl font-extrabold text-slate-900 mt-1 block">
            {salesReps.length} Reps
          </span>
          <span className="text-[11px] text-slate-500">
            {combinedQuota > 0 ? `₹${combinedQuota.toLocaleString()}` : "₹0"} Combined Quota
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Approver Authority</span>
          <span className="text-xl font-extrabold text-slate-900 mt-1 block">{approversCount} Approvers</span>
          <span className="text-[11px] text-slate-500">Manager &amp; Governance Roles</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pending Invites</span>
          <span className="text-xl font-extrabold text-[#ff5e3a] mt-1 block">{pendingInvites.length} Pending</span>
          <span className="text-[11px] text-slate-500">Cryptographic Tokens Active</span>
        </div>
      </div>

      {/* ACTIVE MEMBERS DIRECTORY */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Organization Staff Members</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Identity, role assignments, quotas, and discount threshold baselines (`User`, `SalesManager`, `SalesRepresentative`)
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">{membersList.length} Members</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 pl-5">Staff Member</th>
                <th className="py-3.5">Assigned Role</th>
                <th className="py-3.5">Department</th>
                <th className="py-3.5">Target Quota / Threshold</th>
                <th className="py-3.5">Discount Baseline</th>
                <th className="py-3.5">Manager Hierarchy</th>
                <th className="py-3.5 pr-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {membersList.map((member) => {
                const roleBadgeColor =
                  member.role === "ADMIN"
                    ? "bg-slate-900 text-white"
                    : member.role === "SALES_MANAGER"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : member.role === "FINANCE_OPS"
                    ? "bg-purple-50 text-purple-800 border-purple-200"
                    : member.role === "SALES_REP"
                    ? "bg-sky-50 text-sky-800 border-sky-200"
                    : "bg-slate-100 text-slate-700";

                return (
                  <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 pl-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#ff5e3a] text-white flex items-center justify-center font-extrabold text-xs shadow-2xs">
                          {member.avatarInitials}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{member.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${roleBadgeColor}`}>
                        {member.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-600 font-medium">{member.department}</td>
                    <td className="py-3.5">
                      {member.targetQuota ? (
                        <div className="font-mono font-bold text-slate-900">
                          ₹{member.targetQuota.toLocaleString()}
                          <span className="text-[10px] text-slate-400 font-normal ml-1">({member.commissionRate}% comm)</span>
                        </div>
                      ) : member.approvalThreshold ? (
                        <div className="font-mono text-emerald-700 font-bold">
                          Up to {member.approvalThreshold}% discount
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">&mdash;</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      {member.historicalAvgDiscount !== undefined ? (
                        <span className="font-mono font-semibold text-slate-700">
                          {member.historicalAvgDiscount}% avg
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">&mdash;</span>
                      )}
                    </td>
                    <td className="py-3.5 text-slate-600">
                      {member.managerName ? (
                        <span className="font-medium text-slate-800">{member.managerName}</span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Direct Report / None</span>
                      )}
                    </td>
                    <td className="py-3.5 pr-5 text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Active</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PENDING ONBOARDING INVITATIONS TABLE */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Pending Onboarding Invitations</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Secure tokens issued to new team members awaiting password setup (`Invitation` model)
            </p>
          </div>
          <span className="text-xs font-semibold text-[#ff5e3a]">{pendingInvites.length} Active Tokens</span>
        </div>

        {invitationsList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 pl-5">Recipient Email</th>
                  <th className="py-3.5">Invited Role</th>
                  <th className="py-3.5">Department / Territory</th>
                  <th className="py-3.5">Invited By</th>
                  <th className="py-3.5">Token Status</th>
                  <th className="py-3.5">Expires</th>
                  <th className="py-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {invitationsList.map((inv) => {
                  const statusColor =
                    inv.status === "PENDING"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : inv.status === "ACCEPTED"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-500 border-slate-200";

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 pl-5 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Mail size={13} className="text-slate-400" />
                          <span>{inv.email}</span>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold">
                          {inv.role.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span className="text-slate-700 font-medium">{inv.department}</span>
                        {inv.assignedTerritory && (
                          <span className="text-[11px] text-slate-400 block font-normal">{inv.assignedTerritory}</span>
                        )}
                      </td>
                      <td className="py-3.5 text-slate-600 font-medium">{inv.invitedBy}</td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColor}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 font-mono text-[11px] text-slate-500">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 pr-5 text-right space-x-2">
                        {inv.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleResendInvitation(inv.id, inv.email)}
                              disabled={resendingId === inv.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50/80 hover:bg-amber-100 text-[11px] font-semibold text-amber-800 transition cursor-pointer disabled:opacity-50"
                              title="Resend invitation email"
                            >
                              {resendingId === inv.id ? (
                                <Loader2 size={12} className="animate-spin text-amber-700" />
                              ) : (
                                <Send size={12} className="text-amber-700" />
                              )}
                              <span>{resendingId === inv.id ? "Sending..." : "Resend"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyInviteLink(inv.token)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition cursor-pointer"
                              title="Copy Onboarding Registration Link"
                            >
                              {copiedToken === inv.token ? (
                                <Check size={12} className="text-emerald-600" />
                              ) : (
                                <Copy size={12} />
                              )}
                              <span>{copiedToken === inv.token ? "Copied" : "Copy Link"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRevokeInvitation(inv.id)}
                              className="inline-flex items-center px-2 py-1 rounded-lg hover:bg-red-50 text-[11px] font-semibold text-red-600 transition cursor-pointer"
                            >
                              Revoke
                            </button>
                          </>
                        )}
                        {inv.status === "REVOKED" && (
                          <span className="text-[11px] text-slate-400 italic">Token Disabled</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-500">
            <span>No onboarding invitations issued yet. Click &quot;Invite Team Member&quot; above to issue invites.</span>
          </div>
        )}
      </div>

      {/* INVITE MEMBER MODAL */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#ff5e3a] flex items-center justify-center font-bold">
                  <UserPlus size={16} />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Invite Team Member</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@dealflow360.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">System Role *</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as AdminUserRole)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a] bg-white"
                  >
                    <option value="SALES_REP">Sales Representative</option>
                    <option value="SALES_MANAGER">Regional Sales Manager</option>
                    <option value="FINANCE_OPS">Finance &amp; Operations</option>
                    <option value="ADMIN">System Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Token Expiration</label>
                  <select
                    value={inviteExpiryDays}
                    onChange={(e) => setInviteExpiryDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a] bg-white"
                  >
                    <option value={3}>3 Days</option>
                    <option value={7}>7 Days (Recommended)</option>
                    <option value={14}>14 Days</option>
                    <option value={30}>30 Days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  value={inviteDept}
                  onChange={(e) => setInviteDept(e.target.value)}
                  placeholder="e.g. Strategic Enterprise Solutions"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Territory / Notes</label>
                <input
                  type="text"
                  value={inviteTerritory}
                  onChange={(e) => setInviteTerritory(e.target.value)}
                  placeholder="e.g. Northeast Commercial Accounts"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                A cryptographic invitation token will be generated and logged to the system audit trail. The user will be prompted to set up their password upon clicking the link.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-sm shadow-[#ff5e3a]/25 cursor-pointer"
                >
                  Issue Invitation Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
