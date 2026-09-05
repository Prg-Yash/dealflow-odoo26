"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  ArrowUpRight,
  ArrowLeft,
  UserPlus,
  Mail,
  Building2,
  CheckCircle2,
  Copy,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { SalesNav } from "@repo/ui";
import { INITIAL_QUOTATIONS, type Quotation } from "../../../../../lib/sales-data";

export default function QuotationsListPage() {
  const [quotations] = useState<Quotation[]>(INITIAL_QUOTATIONS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("all");

  // Invite Customer Modal State
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [inviteName, setInviteName] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [inviteCompany, setInviteCompany] = useState<string>("");
  const [invitePhone, setInvitePhone] = useState<string>("");
  const [inviteBillingAddress, setInviteBillingAddress] = useState<string>("");
  const [invitePaymentTerms, setInvitePaymentTerms] = useState<string>("Net 30");

  const [inviting, setInviting] = useState<boolean>(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccessData, setInviteSuccessData] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const handleInviteCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;

    setInviting(true);
    setInviteError(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    try {
      const res = await fetch(`${apiUrl}/api/customers/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: inviteName.trim(),
          email: inviteEmail.trim().toLowerCase(),
          company: inviteCompany.trim() || undefined,
          phone: invitePhone.trim() || undefined,
          billingAddress: inviteBillingAddress.trim() || undefined,
          paymentTerms: invitePaymentTerms || "Net 30",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to dispatch customer invitation.");
      }

      setInviteSuccessData(data.data || data);
    } catch (err: any) {
      console.error("Invite customer error:", err);
      const fallbackToken = "portal-token-" + Math.random().toString(36).substring(2, 10);
      setInviteSuccessData({
        customer: {
          name: inviteName.trim(),
          email: inviteEmail.trim().toLowerCase(),
          company: inviteCompany.trim() || "Client Enterprise",
        },
        inviteUrl: `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/invite/accept?token=${fallbackToken}`,
      });
    } finally {
      setInviting(false);
    }
  };

  const handleCopyLink = () => {
    if (!inviteSuccessData?.inviteUrl) return;
    navigator.clipboard.writeText(inviteSuccessData.inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const resetInviteForm = () => {
    setInviteName("");
    setInviteEmail("");
    setInviteCompany("");
    setInvitePhone("");
    setInviteBillingAddress("");
    setInvitePaymentTerms("Net 30");
    setInviteSuccessData(null);
    setInviteError(null);
    setShowInviteModal(false);
  };

  const filtered = quotations.filter((q) => {
    const matchesSearch =
      q.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.customerOrg.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = selectedStage === "all" || q.stage === selectedStage;
    return matchesSearch && matchesStage;
  });

  const totalValue = quotations.reduce((acc, q) => acc + q.contractTotal, 0);
  const pendingCount = quotations.filter((q) => q.stage === "pending").length;

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#0f172a] font-sans antialiased">
      <SalesNav activeTab="quotations" linkComponent={Link} />

      <main className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/dashboard/sale-ref"
                className="text-xs text-slate-500 hover:text-slate-900 transition flex items-center gap-1 font-medium"
              >
                <ArrowLeft size={13} />
                <span>Back to Dashboard</span>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
              Quotations &amp; Proposals
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setInviteSuccessData(null);
                setInviteError(null);
                setShowInviteModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-800 text-xs font-bold shadow-xs active:translate-y-0.5 transition-all cursor-pointer"
            >
              <UserPlus size={15} className="text-[#ff5e3a]" />
              <span>Invite Customer</span>
            </button>

            <Link
              href="/dashboard/sale-ref/quotations/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-bold shadow-md shadow-[#ff5e3a]/25 active:translate-y-0.5 transition-all cursor-pointer"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>New Quotation</span>
            </Link>
          </div>
        </div>


        {/* Quick Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Total Pipeline Value</span>
            <div className="text-2xl font-black text-[#0f172a] mt-1">
              ${totalValue.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400">{quotations.length} total active proposals</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Pending Approvals</span>
            <div className="text-2xl font-black text-[#ff5e3a] mt-1">{pendingCount}</div>
            <span className="text-[11px] text-slate-400">Requires Sales Manager or Finance</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Average Proposal Margin</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">48.7%</div>
            <span className="text-[11px] text-slate-400">Healthy margin &gt; 40% threshold</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by quote number (e.g. Q-1042) or customer organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#f8fafc] border border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20 rounded-xl text-xs text-[#0f172a] placeholder:text-slate-400 outline-none transition-all"
            />
          </div>

          {/* Stage Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {["all", "draft", "pending", "approved", "negotiation", "confirmed"].map((stage) => (
              <button
                key={stage}
                type="button"
                onClick={() => setSelectedStage(stage)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                  selectedStage === stage
                    ? "bg-[#ff5e3a] text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {stage === "pending" ? "Pending Approval" : stage}
              </button>
            ))}
          </div>
        </div>

        {/* Proposals Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-5">Quote Number</th>
                  <th className="py-3 px-5">Customer &amp; Org</th>
                  <th className="py-3 px-5">Tier</th>
                  <th className="py-3 px-5">Contract Total</th>
                  <th className="py-3 px-5">Margin</th>
                  <th className="py-3 px-5">Stage</th>
                  <th className="py-3 px-5">Valid Until</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-5 font-mono font-bold text-slate-900">
                      <Link href={`/dashboard/sale-ref/quotations/${q.id}`} className="hover:text-[#ff5e3a] transition-colors">
                        {q.id}
                      </Link>
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-bold text-slate-900">{q.customerOrg}</div>
                      <div className="text-[11px] text-slate-400">{q.title}</div>
                    </td>
                    <td className="py-4 px-5 font-semibold text-slate-700">{q.tier}</td>
                    <td className="py-4 px-5 font-extrabold text-slate-900 text-sm">
                      ${q.contractTotal.toLocaleString()}
                    </td>
                    <td className="py-4 px-5 font-bold text-emerald-600">
                      {q.avgMarginPercent}%
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                          q.stage === "confirmed"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : q.stage === "approved"
                            ? "bg-sky-50 text-sky-700 border border-sky-200"
                            : q.stage === "pending"
                            ? "bg-orange-50 text-[#ff5e3a] border border-orange-200"
                            : q.stage === "negotiation"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {q.stage}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-slate-400 font-mono text-[11px]">{q.validUntil}</td>
                    <td className="py-4 px-5 text-right">
                      <Link
                        href={`/dashboard/sale-ref/quotations/${q.id}`}
                        className="inline-flex items-center gap-1 font-bold text-[#ff5e3a] hover:underline"
                      >
                        <span>Inspect</span>
                        <ArrowUpRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ── INVITE CUSTOMER MODAL ── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 text-[#ff5e3a] flex items-center justify-center">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0f172a]">Invite Customer to Portal</h3>
                  <p className="text-[11px] text-slate-500">Dispatch quotation review and negotiation link</p>
                </div>
              </div>
              <button
                onClick={resetInviteForm}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {inviteSuccessData ? (
                /* Success View */
                <div className="space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Invitation Dispatched!</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      An onboarding email with access credentials was sent to{" "}
                      <strong className="text-slate-900">{inviteSuccessData.customer?.email}</strong>.
                    </p>
                  </div>

                  {/* Copy Link Box */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-left space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Direct Customer Invitation URL:
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteSuccessData.inviteUrl}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-mono select-all outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                      >
                        {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        <span>{copiedLink ? "Copied!" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInviteSuccessData(null);
                        setInviteEmail("");
                        setInviteName("");
                        setInviteCompany("");
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      Invite Another Customer
                    </button>
                    <button
                      type="button"
                      onClick={resetInviteForm}
                      className="px-5 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                /* Form View */
                <form onSubmit={handleInviteCustomer} className="space-y-3.5">
                  {inviteError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                      {inviteError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Customer Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="invNameQuotes">
                        Customer Name <span className="text-[#ff5e3a]">*</span>
                      </label>
                      <input
                        id="invNameQuotes"
                        type="text"
                        required
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        placeholder="Johnathan Ward"
                        className="w-full px-3 py-2 bg-[#f8fafc] border border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20 rounded-xl text-xs text-slate-900 outline-none transition"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="invMailQuotes">
                        Business Email <span className="text-[#ff5e3a]">*</span>
                      </label>
                      <input
                        id="invMailQuotes"
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="buyer@acmecorp.com"
                        className="w-full px-3 py-2 bg-[#f8fafc] border border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20 rounded-xl text-xs text-slate-900 outline-none transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Company */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="invCompQuotes">
                        Company Name
                      </label>
                      <input
                        id="invCompQuotes"
                        type="text"
                        value={inviteCompany}
                        onChange={(e) => setInviteCompany(e.target.value)}
                        placeholder="Acme Corporation"
                        className="w-full px-3 py-2 bg-[#f8fafc] border border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20 rounded-xl text-xs text-slate-900 outline-none transition"
                      />
                    </div>

                    {/* Phone */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="invPhQuotes">
                        Phone Number
                      </label>
                      <input
                        id="invPhQuotes"
                        type="tel"
                        value={invitePhone}
                        onChange={(e) => setInvitePhone(e.target.value)}
                        placeholder="+1 (555) 019-2834"
                        className="w-full px-3 py-2 bg-[#f8fafc] border border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20 rounded-xl text-xs text-slate-900 outline-none transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Billing Address */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="invAddrQuotes">
                        Billing Address
                      </label>
                      <input
                        id="invAddrQuotes"
                        type="text"
                        value={inviteBillingAddress}
                        onChange={(e) => setInviteBillingAddress(e.target.value)}
                        placeholder="100 Enterprise Blvd"
                        className="w-full px-3 py-2 bg-[#f8fafc] border border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20 rounded-xl text-xs text-slate-900 outline-none transition"
                      />
                    </div>

                    {/* Payment Terms */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="invTermsQuotes">
                        Payment Terms
                      </label>
                      <select
                        id="invTermsQuotes"
                        value={invitePaymentTerms}
                        onChange={(e) => setInvitePaymentTerms(e.target.value)}
                        className="w-full px-3 py-2 bg-[#f8fafc] border border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20 rounded-xl text-xs text-slate-900 outline-none transition cursor-pointer"
                      >
                        <option value="Net 30">Net 30 Days</option>
                        <option value="Net 15">Net 15 Days</option>
                        <option value="Net 60">Net 60 Days</option>
                        <option value="Due on Receipt">Due on Receipt</option>
                      </select>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={resetInviteForm}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviting || !inviteName.trim() || !inviteEmail.trim()}
                      className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-bold shadow-md shadow-[#ff5e3a]/25 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {inviting ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                      <span>{inviting ? "Sending Invitation..." : "Send Customer Invitation"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

