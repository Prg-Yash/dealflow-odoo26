"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Plus,
  Play,
  CheckCircle2,
  Sparkles,
  X,
  Lock,
} from "lucide-react";
import {
  MOCK_ADMIN_RULES,
  MOCK_ADMIN_CUSTOMER_TIERS,
  type AdminDiscountRule,
  type AdminCustomerTier,
  type AdminEscalationLevel,
} from "../../../../../lib/admin-data";

export default function AdminRulesPage() {
  const [rulesList, setRulesList] = useState<AdminDiscountRule[]>(MOCK_ADMIN_RULES);
  const [customerTiers] = useState<AdminCustomerTier[]>(MOCK_ADMIN_CUSTOMER_TIERS);

  // Live Simulator States
  const [simDiscount, setSimDiscount] = useState<number>(8.5);
  const [simRiskScore, setSimRiskScore] = useState<number>(12.0);
  const [simTierCode, setSimTierCode] = useState<string>("SILVER");

  // Modal State
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newMinDiscount, setNewMinDiscount] = useState<number>(0);
  const [newMaxDiscount, setNewMaxDiscount] = useState<number>(10);
  const [newMinRisk, setNewMinRisk] = useState<number>(0);
  const [newMaxRisk, setNewMaxRisk] = useState<number>(15);
  const [newEscalation, setNewEscalation] = useState<AdminEscalationLevel>("SALES_MANAGER");
  const [newRuleDesc, setNewRuleDesc] = useState("");

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Evaluate Live Simulator Output
  const evaluatedRule: AdminDiscountRule =
    rulesList.find(
      (r) =>
        simDiscount >= r.minDiscountPercent &&
        simDiscount <= r.maxDiscountPercent
    ) ?? rulesList[rulesList.length - 1] ?? rulesList[0]!;

  const selectedSimTier: AdminCustomerTier =
    customerTiers.find((t) => t.code === simTierCode) ?? customerTiers[0]!;
  const isTierCeilingBreached = simDiscount > selectedSimTier.discountCeiling;

  // Determine final escalation
  let finalApprover = evaluatedRule.escalationLevel;
  if (isTierCeilingBreached && finalApprover === "NONE") {
    finalApprover = "SALES_MANAGER";
  }

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;

    const newRule: AdminDiscountRule = {
      id: `rule-${Date.now()}`,
      name: newRuleName.trim(),
      minDiscountPercent: Number(newMinDiscount),
      maxDiscountPercent: Number(newMaxDiscount),
      minBlendedRiskScore: Number(newMinRisk),
      maxBlendedRiskScore: Number(newMaxRisk),
      requiresManagerApproval: newEscalation !== "NONE",
      requiresFinanceApproval: newEscalation === "SALES_MANAGER_AND_FINANCE",
      escalationLevel: newEscalation,
      description: newRuleDesc.trim(),
      isActive: true,
      dealTriggersCount: 0,
    };

    setRulesList([...rulesList, newRule]);
    setIsAddRuleOpen(false);
    showToast(`Created approval rule "${newRule.name}"`);

    // Reset
    setNewRuleName("");
    setNewRuleDesc("");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2 border border-slate-700 animate-in slide-in-from-bottom-3 duration-200">
          <Sparkles size={14} className="text-[#ff5e3a]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/dashboard/admin" className="hover:text-slate-900">Admin Console</Link>
            <span>/</span>
            <span className="text-[#ff5e3a]">Governance Rules</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Discount Approval Matrix &amp; Tier Ceilings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure multi-level escalation rules (`DiscountApprovalRule`), risk score boundaries, and customer tier ceilings.
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => setIsAddRuleOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-sm shadow-[#ff5e3a]/25 transition cursor-pointer"
        >
          <Plus size={15} />
          <span>Add Escalation Rule</span>
        </button>
      </div>

      {/* INTERACTIVE RULE SIMULATOR CARD */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] relative overflow-hidden">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#ff5e3a] flex items-center justify-center">
              <Play size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Interactive Governance Simulator</h2>
              <p className="text-xs text-slate-500">
                Test deal parameters to preview live approval workflow routing and ceiling breach warnings
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-mono font-semibold">
            Live Engine
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls: 7 cols */}
          <div className="lg:col-span-7 space-y-5">
            {/* Slider 1: Discount % */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
                <span>Quotation Proposed Discount:</span>
                <span className="font-mono text-sm font-extrabold text-[#ff5e3a]">{simDiscount.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="0.5"
                value={simDiscount}
                onChange={(e) => setSimDiscount(parseFloat(e.target.value))}
                className="w-full h-2 rounded-lg bg-slate-200 accent-[#ff5e3a] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                <span>0% (Full Price)</span>
                <span>10%</span>
                <span>20%</span>
                <span>30% (Deep Concession)</span>
              </div>
            </div>

            {/* Slider 2: Risk Score */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
                <span>Blended Deal Risk Score:</span>
                <span className="font-mono text-sm font-extrabold text-slate-900">{simRiskScore.toFixed(1)} / 100</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={simRiskScore}
                onChange={(e) => setSimRiskScore(parseFloat(e.target.value))}
                className="w-full h-2 rounded-lg bg-slate-200 accent-slate-800 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                <span>0.0 (Low Risk)</span>
                <span>25.0 (Moderate)</span>
                <span>50.0 (High Risk)</span>
              </div>
            </div>

            {/* Selector: Customer Tier */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Customer Tier Classification:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {customerTiers.map((tier) => (
                  <button
                    key={tier.code}
                    type="button"
                    onClick={() => setSimTierCode(tier.code)}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                      simTierCode === tier.code
                        ? "border-[#ff5e3a] bg-orange-50/50 text-[#ff5e3a] shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-[11px] uppercase tracking-wider">{tier.name.split(" ")[0]}</div>
                    <div className="text-[10px] font-mono text-slate-500 font-normal mt-0.5">Cap: {tier.discountCeiling}%</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Outcome Card: 5 cols */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-900 text-white flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                <span>Simulator Evaluation</span>
                <span className="text-[#ff5e3a]">Real-Time Result</span>
              </div>

              {/* Status Header */}
              <div className="flex items-center gap-3 mb-4">
                {finalApprover === "NONE" ? (
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <CheckCircle2 size={22} />
                  </div>
                ) : finalApprover === "SALES_MANAGER" ? (
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <ShieldAlert size={22} />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold">
                    <Lock size={22} />
                  </div>
                )}
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {finalApprover === "NONE"
                      ? "Auto-Approved"
                      : finalApprover === "SALES_MANAGER"
                      ? "Sales Manager Escalation"
                      : "Finance Dual Approval Required"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Rule Triggered: {evaluatedRule.name}
                  </p>
                </div>
              </div>

              {/* Diagnostics List */}
              <div className="space-y-2.5 pt-3 border-t border-slate-800 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Escalation Level:</span>
                  <span className="font-mono font-bold text-white">{finalApprover}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Assigned Reviewer:</span>
                  <span className="font-medium text-slate-200">
                    {finalApprover === "NONE"
                      ? "None (Rep Discretion)"
                      : finalApprover === "SALES_MANAGER"
                      ? "Elena Rostova (Regional Director)"
                      : "Marcus Vance & Elena Rostova"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Customer Tier Ceiling:</span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                      isTierCeilingBreached
                        ? "bg-red-900/50 text-red-300 border border-red-800"
                        : "bg-emerald-900/50 text-emerald-300 border border-emerald-800"
                    }`}
                  >
                    {isTierCeilingBreached
                      ? `Breached (${simDiscount}% > ${selectedSimTier.discountCeiling}%)`
                      : `Compliant (≤ ${selectedSimTier.discountCeiling}%)`}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
              {isTierCeilingBreached
                ? "⚠️ Concession exceeds customer tier agreement. Manager review enforced regardless of overall discount."
                : "✓ Quotation complies with customer tier contractual boundaries."}
            </div>
          </div>
        </div>
      </div>

      {/* ACTIVE DISCOUNT RULES TABLE */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Configured Discount Approval Rules</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Active rules governing quotes in DealFlow360 (`DiscountApprovalRule`)
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">{rulesList.length} Active Rules</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 pl-5">Rule Name &amp; Description</th>
                <th className="py-3.5">Discount Window</th>
                <th className="py-3.5">Risk Score Window</th>
                <th className="py-3.5">Escalation Required</th>
                <th className="py-3.5">Reviewer Role</th>
                <th className="py-3.5 text-center">Deals Governed</th>
                <th className="py-3.5 pr-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {rulesList.map((rule) => {
                const escalationColor =
                  rule.escalationLevel === "NONE"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : rule.escalationLevel === "SALES_MANAGER"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-purple-50 text-purple-700 border-purple-200";

                return (
                  <tr key={rule.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 pl-5 max-w-xs">
                      <div className="font-bold text-slate-900">{rule.name}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{rule.description}</div>
                    </td>
                    <td className="py-3.5 font-mono font-bold text-slate-800">
                      {rule.minDiscountPercent}% &ndash; {rule.maxDiscountPercent}%
                    </td>
                    <td className="py-3.5 font-mono text-slate-600">
                      {rule.minBlendedRiskScore} &ndash; {rule.maxBlendedRiskScore} pts
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${escalationColor}`}>
                        {rule.escalationLevel}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-700 font-medium">
                      {rule.escalationLevel === "NONE"
                        ? "None (Auto-Pass)"
                        : rule.escalationLevel === "SALES_MANAGER"
                        ? "Sales Manager"
                        : "Manager & Finance"}
                    </td>
                    <td className="py-3.5 text-center font-extrabold text-slate-900">
                      {rule.dealTriggersCount}
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

      {/* CUSTOMER TIERS MATRIX */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Customer Tier Discount Ceilings</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Maximum allowable customer-specific discount ceilings (`CustomerTier` model)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {customerTiers.map((tier) => (
            <div key={tier.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 text-sm">{tier.name}</span>
                  <span className="font-mono text-[11px] text-slate-400">{tier.code}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{tier.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                <span className="text-xs text-slate-500">Discount Cap:</span>
                <span className="text-base font-extrabold text-[#ff5e3a] font-mono">{tier.discountCeiling}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ADD RULE MODAL */}
      {isAddRuleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#ff5e3a] flex items-center justify-center font-bold">
                  <Plus size={16} />
                </div>
                <h2 className="text-lg font-bold text-slate-900">New Discount Approval Rule</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddRuleOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rule Name *</label>
                <input
                  type="text"
                  required
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="e.g. Strategic High-Concession Rule"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Min Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    value={newMinDiscount}
                    onChange={(e) => setNewMinDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Max Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    value={newMaxDiscount}
                    onChange={(e) => setNewMaxDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Min Risk Score (pts)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    required
                    value={newMinRisk}
                    onChange={(e) => setNewMinRisk(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Max Risk Score (pts)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    required
                    value={newMaxRisk}
                    onChange={(e) => setNewMaxRisk(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Escalation Hierarchy Level *</label>
                <select
                  value={newEscalation}
                  onChange={(e) => setNewEscalation(e.target.value as AdminEscalationLevel)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a] bg-white"
                >
                  <option value="NONE">NONE (Auto-Approved / Rep Discretion)</option>
                  <option value="SALES_MANAGER">SALES_MANAGER (Regional Director Review)</option>
                  <option value="SALES_MANAGER_AND_FINANCE">SALES_MANAGER_AND_FINANCE (Dual High-Risk Sign-off)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Policy Description</label>
                <textarea
                  rows={2}
                  value={newRuleDesc}
                  onChange={(e) => setNewRuleDesc(e.target.value)}
                  placeholder="Rationale and conditions under which this rule fires..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddRuleOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-sm shadow-[#ff5e3a]/25 cursor-pointer"
                >
                  Save Governance Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
