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
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import {
  type AdminDiscountRule,
  type AdminCustomerTier,
  type AdminEscalationLevel,
} from "../../../../../lib/admin-data";
import {
  useDiscountRules,
  useCustomerTiers,
  useCategories,
  useCreateDiscountRule,
} from "../../../../../lib/query";

export default function AdminRulesPage() {
  const { data: apiRules, isLoading: isRulesLoading, refetch: refetchRules } = useDiscountRules();
  const { data: apiTiers, isLoading: isTiersLoading, refetch: refetchTiers } = useCustomerTiers();
  const { data: apiCategories, isLoading: isCatsLoading, refetch: refetchCats } = useCategories();
  const createRuleMutation = useCreateDiscountRule();

  const rulesList: AdminDiscountRule[] = apiRules && apiRules.length > 0
    ? apiRules.map((r) => {
        const escalation: AdminEscalationLevel =
          (r as any).requiredRole === "FINANCE_OPS" || r.escalationLevel === "FINANCE"
            ? "SALES_MANAGER_AND_FINANCE"
            : (r as any).requiredRole === "SALES_MANAGER" || r.escalationLevel === "SALES_MANAGER"
            ? "SALES_MANAGER"
            : "NONE";
        return {
          id: r.id,
          name: r.name,
          minDiscountPercent: (r as any).minDiscountPercent ?? r.minDiscount ?? 0,
          maxDiscountPercent: (r as any).maxDiscountPercent ?? r.maxDiscount ?? 10,
          minBlendedRiskScore: r.minRiskScore ?? 0,
          maxBlendedRiskScore: r.maxRiskScore ?? 15,
          requiresManagerApproval: escalation === "SALES_MANAGER" || escalation === "SALES_MANAGER_AND_FINANCE",
          requiresFinanceApproval: escalation === "SALES_MANAGER_AND_FINANCE",
          escalationLevel: escalation,
          description: r.description || "",
          isActive: r.isActive,
          dealTriggersCount: 0,
        };
      })
    : [
        {
          id: "seed-tier-1",
          name: "Standard Discretion Limit",
          minDiscountPercent: 0,
          maxDiscountPercent: 5,
          minBlendedRiskScore: 0,
          maxBlendedRiskScore: 10,
          requiresManagerApproval: false,
          requiresFinanceApproval: false,
          escalationLevel: "NONE",
          description: "Standard sales representative autonomous discount allowance.",
          isActive: true,
          dealTriggersCount: 0,
        },
        {
          id: "seed-tier-2",
          name: "Manager Escalation Threshold",
          minDiscountPercent: 5.01,
          maxDiscountPercent: 15,
          minBlendedRiskScore: 10.01,
          maxBlendedRiskScore: 25,
          requiresManagerApproval: true,
          requiresFinanceApproval: false,
          escalationLevel: "SALES_MANAGER",
          description: "Requires explicit Sales Manager sign-off before quotation dispatch.",
          isActive: true,
          dealTriggersCount: 0,
        },
        {
          id: "seed-tier-3",
          name: "Executive & Finance Approval Gate",
          minDiscountPercent: 15.01,
          maxDiscountPercent: 40,
          minBlendedRiskScore: 25.01,
          maxBlendedRiskScore: 100,
          requiresManagerApproval: true,
          requiresFinanceApproval: true,
          escalationLevel: "SALES_MANAGER_AND_FINANCE",
          description: "High margin impact or non-standard terms requiring dual sign-off.",
          isActive: true,
          dealTriggersCount: 0,
        },
      ];

  const customerTiers: AdminCustomerTier[] = apiTiers && apiTiers.length > 0
    ? apiTiers.map((t) => ({
        id: t.id,
        name: t.name,
        code: t.code,
        discountCeiling: t.discountCeiling,
        customerCount: 0,
        description: t.description || "",
      }))
    : [
        { id: "bronze", name: "Bronze", code: "BRONZE", discountCeiling: 5, customerCount: 0, description: "Entry-tier accounts" },
        { id: "silver", name: "Silver", code: "SILVER", discountCeiling: 10, customerCount: 0, description: "Growth-tier accounts" },
        { id: "gold", name: "Gold", code: "GOLD", discountCeiling: 15, customerCount: 0, description: "Strategic accounts" },
      ];

  const categoriesList = Array.isArray(apiCategories) ? apiCategories : [];

  // Live Simulator States
  const [simDiscount, setSimDiscount] = useState<number>(8.5);
  const [simRiskScore, setSimRiskScore] = useState<number>(12.0);
  const [simTierCode, setSimTierCode] = useState<string>(customerTiers[1]?.code || "SILVER");

  // Modal State
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newMinDiscount, setNewMinDiscount] = useState<number>(0);
  const [newMaxDiscount, setNewMaxDiscount] = useState<number>(10);
  const [newMinRisk, setNewMinRisk] = useState<number>(0);
  const [newMaxRisk, setNewMaxRisk] = useState<number>(15);
  const [newEscalation, setNewEscalation] = useState<AdminEscalationLevel>("SALES_MANAGER");
  const [newRuleDesc, setNewRuleDesc] = useState("");
  const [isSubmittingRule, setIsSubmittingRule] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRefresh = async () => {
    await Promise.all([refetchRules(), refetchTiers(), refetchCats()]);
    showToast("Discount rules and ceilings synchronized with database.");
  };

  // Evaluate Live Simulator Output
  const evaluatedRule: AdminDiscountRule =
    rulesList.find(
      (r) =>
        simDiscount >= r.minDiscountPercent &&
        simDiscount <= r.maxDiscountPercent
    ) ??
    rulesList[rulesList.length - 1] ?? {
      id: "default-rule",
      name: "Standard Rep Discretion",
      minDiscountPercent: 0,
      maxDiscountPercent: 5,
      minBlendedRiskScore: 0,
      maxBlendedRiskScore: 10,
      requiresManagerApproval: simDiscount > 5,
      requiresFinanceApproval: simDiscount > 15,
      escalationLevel: simDiscount > 15 ? "SALES_MANAGER_AND_FINANCE" : simDiscount > 5 ? "SALES_MANAGER" : "NONE",
      description: "Default fallback rule",
      isActive: true,
      dealTriggersCount: 0,
    };

  const selectedSimTier: AdminCustomerTier =
    customerTiers.find((t) => t.code === simTierCode) ??
    customerTiers[0] ?? {
      id: "default-tier",
      name: "Standard Tier",
      code: "STANDARD",
      discountCeiling: 5.0,
      customerCount: 0,
      description: "Standard customer baseline",
    };
  const isTierCeilingBreached = simDiscount > selectedSimTier.discountCeiling;

  // Determine final escalation
  let finalApprover = evaluatedRule.escalationLevel;
  if (isTierCeilingBreached && finalApprover === "NONE") {
    finalApprover = "SALES_MANAGER";
  }

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) {
      showToast("Rule name is required.");
      return;
    }

    setIsSubmittingRule(true);
    try {
      await createRuleMutation.mutateAsync({
        name: newRuleName.trim(),
        minDiscount: Number(newMinDiscount),
        maxDiscount: Number(newMaxDiscount),
        minRiskScore: Number(newMinRisk),
        maxRiskScore: Number(newMaxRisk),
        escalationLevel: newEscalation === "SALES_MANAGER_AND_FINANCE" ? "FINANCE" : "SALES_MANAGER",
        description: newRuleDesc.trim(),
      });
      showToast(`Created approval rule "${newRuleName}"`);
      setIsAddRuleOpen(false);
      setNewRuleName("");
      setNewRuleDesc("");
      await refetchRules();
    } catch (err: any) {
      showToast(`Error creating rule: ${err?.message || "Failed"}`);
    } finally {
      setIsSubmittingRule(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/dashboard/admin" className="hover:text-slate-900">
              Admin Console
            </Link>
            <span>/</span>
            <span className="text-[#ff5e3a]">Discount Rules &amp; Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Discount Tiers &amp; Approval Chains
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated quotation gating, customer tier ceilings, and multi-level manager escalation matrix.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            title="Synchronize database"
          >
            <RefreshCw size={15} className={isRulesLoading || isTiersLoading || isCatsLoading ? "animate-spin text-[#ff5e3a]" : ""} />
          </button>
          <button
            type="button"
            onClick={() => setIsAddRuleOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-sm shadow-[#ff5e3a]/25 transition cursor-pointer"
          >
            <Plus size={15} />
            <span>New Approval Rule</span>
          </button>
        </div>
      </div>

      {/* Interactive Simulator Card */}
      <div className="rounded-3xl bg-slate-900 p-6 md:p-8 text-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#ff5e3a]/20 text-[#ff5e3a]">
              <Play size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Live Deal Escalation Simulator</h2>
              <p className="text-xs text-slate-400">Test how commercial parameters trigger automated approval workflows</p>
            </div>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
            Real-time Logic Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Input 1: Requested Discount */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">Discount Requested</label>
              <span className="text-sm font-mono font-bold text-[#ff5e3a]">{simDiscount}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              step="0.5"
              value={simDiscount}
              onChange={(e) => setSimDiscount(Number(e.target.value))}
              className="w-full accent-[#ff5e3a] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>0% (Full Price)</span>
              <span>20%</span>
              <span>40% (Deep)</span>
            </div>
          </div>

          {/* Input 2: Risk Score */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">Blended Risk Score</label>
              <span className="text-sm font-mono font-bold text-amber-400">{simRiskScore} pts</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={simRiskScore}
              onChange={(e) => setSimRiskScore(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>0 (Low risk)</span>
              <span>25 (Medium)</span>
              <span>50 (High)</span>
            </div>
          </div>

          {/* Input 3: Customer Tier */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">Customer Account Tier</label>
              <span className="text-xs font-mono text-slate-400">Ceiling: {selectedSimTier.discountCeiling}%</span>
            </div>
            <select
              value={simTierCode}
              onChange={(e) => setSimTierCode(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-[#ff5e3a]"
            >
              {customerTiers.map((t) => (
                <option key={t.id} value={t.code}>
                  {t.name} (Max {t.discountCeiling}%)
                </option>
              ))}
            </select>
            <div className="text-[10px] text-slate-400 mt-2">
              {isTierCeilingBreached ? (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <AlertTriangle size={11} /> Discount exceeds tier ceiling ({selectedSimTier.discountCeiling}%)
                </span>
              ) : (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={11} /> Within allowable account tier ceiling
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Evaluation Result Bar */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${
              finalApprover === "NONE"
                ? "bg-emerald-500/20 text-emerald-400"
                : finalApprover === "SALES_MANAGER"
                ? "bg-amber-500/20 text-amber-400"
                : "bg-red-500/20 text-red-400"
            }`}>
              {finalApprover === "NONE" ? <CheckCircle2 size={20} /> : <ShieldAlert size={20} />}
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400">
                Triggered Approval Level
              </div>
              <div className="text-lg font-bold text-white">
                {finalApprover === "NONE"
                  ? "Automatic Approval (No Escalation Needed)"
                  : finalApprover === "SALES_MANAGER"
                  ? "Sales Manager Sign-off Required"
                  : "Sales Manager + Finance Dual Sign-off Required"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-mono">MATCHED GOVERNANCE RULE</span>
              <span className="text-xs font-semibold text-slate-200">{evaluatedRule.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Columns: Customer Tier Ceilings & Category Taxonomy Ceilings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tier Discount Ceilings (Live from DB) */}
        <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Customer Tier Discount Ceilings</h2>
              <p className="text-xs text-slate-500 mt-0.5">Live account classification thresholds</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
              {customerTiers.length} Tiers
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200/80 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Tier</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4 text-right">Max Discount</th>
                  <th className="py-3 px-4 text-right">Policy Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isTiersLoading ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">Loading customer tiers...</td>
                  </tr>
                ) : (
                  customerTiers.map((tier) => (
                    <tr key={tier.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{tier.name}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">{tier.code}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#ff5e3a]">
                        {tier.discountCeiling}%
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Enforced
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Discount Ceilings (Live from DB) */}
        <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Category Ceilings &amp; Taxonomies</h2>
              <p className="text-xs text-slate-500 mt-0.5">Commercial classification governance</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
              {categoriesList.length} Categories
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200/80 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Escalation Policy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isCatsLoading ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400">Loading categories...</td>
                  </tr>
                ) : categoriesList.length > 0 ? (
                  categoriesList.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{cat.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{cat.slug}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 font-semibold">
                        {cat.type}
                      </td>
                      <td className="py-3.5 px-4 text-right text-[11px] text-slate-500">
                        {cat.type === "HARDWARE"
                          ? "Strict COGS Floor"
                          : cat.type === "SUBSCRIPTION"
                          ? "ARR Retention Priority"
                          : "Time & Materials Limit"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400">No categories found in database.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Dynamic Approval Chain Rules Matrix */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Active Escalation Rules Matrix</h2>
            <p className="text-xs text-slate-500 mt-0.5">Database-configured discount ranges and required sign-off levels</p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {rulesList.length} rules active
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold">
                <th className="py-3 px-4">Rule Name</th>
                <th className="py-3 px-4">Discount Range</th>
                <th className="py-3 px-4">Blended Risk Range</th>
                <th className="py-3 px-4">Required Approver</th>
                <th className="py-3 px-4 pr-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isRulesLoading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">Loading rules matrix...</td>
                </tr>
              ) : (
                rulesList.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{r.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{r.description}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {r.minDiscountPercent}% - {r.maxDiscountPercent}%
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {r.minBlendedRiskScore} - {r.maxBlendedRiskScore}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        r.escalationLevel === "NONE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : r.escalationLevel === "SALES_MANAGER"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}>
                        {r.escalationLevel === "NONE"
                          ? "No Approval Needed"
                          : r.escalationLevel === "SALES_MANAGER"
                          ? "Sales Manager"
                          : "Sales Manager + Finance Ops"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 pr-5 text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Audit Callout */}
      <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-900 space-y-1">
        <p className="font-bold text-amber-950 flex items-center gap-1.5">
          <ShieldAlert size={15} className="text-amber-700" />
          Blended Risk Governance Rule:
        </p>
        <p className="text-amber-800/90 leading-relaxed">
          When a quotation combines SKUs across multiple product categories with contrasting margin baselines, DealFlow 360 dynamically computes a weighted blended risk score and automatically routes the deal to the highest required approval tier. All approvals, rejections, and edits are immutably logged with timestamp, user ID, and justification notes.
        </p>
      </div>

      {/* Modal: Add Approval Rule */}
      {isAddRuleOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-900">Add New Approval Rule</h3>
              <button
                type="button"
                onClick={() => setIsAddRuleOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Strategic Volume Exception"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Min Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newMinDiscount}
                    onChange={(e) => setNewMinDiscount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Max Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newMaxDiscount}
                    onChange={(e) => setNewMaxDiscount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Min Risk Score</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newMinRisk}
                    onChange={(e) => setNewMinRisk(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Max Risk Score</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newMaxRisk}
                    onChange={(e) => setNewMaxRisk(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Required Approver</label>
                <select
                  value={newEscalation}
                  onChange={(e) => setNewEscalation(e.target.value as AdminEscalationLevel)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
                >
                  <option value="NONE">Automatic Pass (No Escalation)</option>
                  <option value="SALES_MANAGER">Sales Manager Approval</option>
                  <option value="SALES_MANAGER_AND_FINANCE">Sales Manager &amp; Finance Dual Sign-off</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Justification and policy notes..."
                  value={newRuleDesc}
                  onChange={(e) => setNewRuleDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
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
                  disabled={isSubmittingRule}
                  className="px-5 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-sm shadow-[#ff5e3a]/25 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingRule ? "Creating..." : "Save Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
