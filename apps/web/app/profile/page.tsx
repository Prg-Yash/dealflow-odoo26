"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Home, Zap, AlertCircle, ArrowLeft, Target, ShieldCheck, CreditCard, Users, Briefcase, Activity, CheckCircle2, Building } from "lucide-react";
import { useSession, signOut, sendVerificationEmail } from "../../lib/auth-client";
import { BrandLogo, SalesNav, AdminNav } from "@repo/ui";
import { getStoredRole, ROLES } from "../../lib/roles";
import { useQuotations, useMembers, useDealAnomalies, useCurrentOrg } from "../../lib/query";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [loggingOut, setLoggingOut] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [demoRole] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return getStoredRole();
    }
    return null;
  });
  
  const [verificationAlert, setVerificationAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("verified") === "true") {
        return {
          type: "success",
          message: "🎉 Email verified successfully! Your workspace account is now verified.",
        };
      }
    }
    return null;
  });

  // Queries
  const { data: quotes = [] } = useQuotations();
  const { data: members = [] } = useMembers();
  const { data: anomaliesData } = useDealAnomalies();
  const { data: org } = useCurrentOrg();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("verified") === "true") {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("df360_user_role");
        document.cookie = "demo_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
      await signOut();
      router.push("/login");
    } catch {
      router.push("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    if (!session?.user?.email) return;
    setSendingVerification(true);
    setVerificationAlert(null);

    try {
      await sendVerificationEmail({
        email: session.user.email,
        callbackURL: `${window.location.origin}/profile?verified=true`,
      });
      setVerificationAlert({
        type: "success",
        message: `✉️ Verification email sent to ${session.user.email}! Please check your inbox (or terminal console).`,
      });
    } catch (err) {
      setVerificationAlert({
        type: "error",
        message: (err as Error).message || "Failed to send verification email. Please try again.",
      });
    } finally {
      setSendingVerification(false);
    }
  };



  if (isPending) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-xl max-w-md w-full text-center">
          <div className="w-8 h-8 border-3 border-[#ff5e3a] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-500">Loading session from standalone API...</p>
        </div>
      </div>
    );
  }

  if (!session?.user && !demoRole) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans antialiased flex flex-col justify-between">
        <header className="w-full border-b border-slate-200 bg-white/95 px-6 py-4 flex items-center justify-between">
          <BrandLogo href="/" />
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 shadow-xl max-w-md w-full text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-semibold mb-4 border border-red-200">
              <AlertCircle size={14} />
              <span>No Active Session</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
            <p className="text-sm text-slate-500 mb-6">
              You are currently signed out. Please sign in or create an account to view your workspace session.
            </p>
            <div className="flex gap-3">
              <Link href="/login" className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#ff5e3a] text-white font-semibold text-xs shadow-md shadow-[#ff5e3a]/25 hover:bg-[#ea4e28] transition">Sign In</Link>
              <Link href="/register" className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition">Register</Link>
            </div>
          </div>
        </main>
        <footer className="w-full py-4 text-center border-t border-slate-200 bg-white text-xs text-slate-400">
          DealFlow360 Orchestration Platform &copy; 2025
        </footer>
      </div>
    );
  }

  const user = session?.user || {
    id: "demo-" + Math.random().toString(36).substring(7),
    name: ROLES[demoRole as keyof typeof ROLES]?.defaultName || "Workspace User",
    email: ROLES[demoRole as keyof typeof ROLES]?.defaultEmail || "user@dealflow360.com",
    emailVerified: false,
  };

  const isDemo = !session?.user;
  const initials = user.name ? user.name.trim().split(/\s+/).map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() : "U";

  const renderTopNav = () => {
    if (demoRole === "admin") {
      return (
        <AdminNav
          currentPath="/profile"
          adminName={user.name || "Admin"}
          adminEmail={user.email}
          adminInitials={initials}
          orgName={org?.name || "Acme Corp"}
          onSignOut={handleSignOut}
          linkComponent={Link as any}
        />
      );
    }
    
    if (demoRole === "sales_rep" || demoRole === "manager" || demoRole === "finance") {
      let roleLabel = "Sales Rep";
      if (demoRole === "manager") roleLabel = "Manager";
      if (demoRole === "finance") roleLabel = "Finance Ops";
      
      return (
        <SalesNav
          activeTab={undefined as any}
          userName={user.name || "User"}
          userInitials={initials}
          roleLabel={roleLabel}
          onSignOut={handleSignOut}
          linkComponent={Link as any}
        />
      );
    }

    return (
      <header className="w-full border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <BrandLogo href="/dashboard" subtitle="Profile & Session" />
        <Link
          href="/portal"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
        >
          <ArrowLeft size={14} />
          <span>To Customer Portal</span>
        </Link>
      </header>
    );
  };

  const renderRoleData = () => {
    if (demoRole === "admin") {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-purple-50 border border-purple-200 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
              <Building size={18} />
              <h3>Organization Info</h3>
            </div>
            <div className="flex flex-col border-b border-purple-100 pb-2 gap-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-500">Name</span>
              <span className="text-base font-black text-purple-900 break-words">{org?.name || "Acme Corp"}</span>
            </div>
            <div className="flex flex-col border-b border-purple-100 pb-2 gap-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-500">Workspace Slug</span>
              <span className="text-base font-black text-purple-900 break-words">{org?.slug || "acme-corp"}</span>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-3">
             <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <Activity size={18} />
              <h3>Administrative Privileges</h3>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">Manage Users & Roles</span>
              <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">Global Settings</span>
              <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">Billing Admin</span>
            </div>
          </div>
        </div>
      );
    }
    
    if (demoRole === "sales_rep") {
      const pipelineTotal = quotes.reduce((acc, q) => acc + (Number(q.grandTotal) || 0), 0);
      const pendingCount = quotes.filter(q => q.stage === "PENDING_APPROVAL").length;
      const winRate = pipelineTotal > 0 ? 68 : 0;
      
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-orange-50 border border-orange-200 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[#ff5e3a] font-bold text-sm">
              <Target size={18} />
              <h3>Quota Attainment</h3>
            </div>
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs text-orange-700 font-medium">Monthly Progress</span>
                <span className="text-sm font-black text-orange-900">{(pipelineTotal/1000).toFixed(0)}k / 500k</span>
              </div>
              <div className="w-full bg-orange-200 h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#ff5e3a] h-full rounded-full" style={{ width: `${Math.min((pipelineTotal/500000)*100, 100) || 5}%` }}></div>
              </div>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-3">
             <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <Briefcase size={18} />
              <h3>Pipeline Summary</h3>
            </div>
            <div className="flex justify-between items-end border-b border-slate-100 pb-2 mt-1">
              <span className="text-xs text-slate-500 font-medium">Total Pipeline Value</span>
              <span className="text-sm font-black text-slate-900">₹{pipelineTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-end border-b border-slate-100 pb-2">
              <span className="text-xs text-slate-500 font-medium">Pending Approvals</span>
              <span className="text-sm font-black text-amber-600">{pendingCount} Deals</span>
            </div>
          </div>
        </div>
      );
    }
    
    if (demoRole === "manager") {
      const pendingCount = quotes.filter(q => q.stage === "PENDING_APPROVAL").length;
      
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
              <Users size={18} />
              <h3>Team Overview</h3>
            </div>
            <div className="flex justify-between items-end border-b border-blue-100 pb-2">
              <span className="text-xs text-blue-600 font-medium">Direct Reports</span>
              <span className="text-lg font-black text-blue-900">{members.length || 8}</span>
            </div>
            <div className="flex justify-between items-end border-b border-blue-100 pb-2">
              <span className="text-xs text-blue-600 font-medium">Pending Approvals</span>
              <span className="text-lg font-black text-blue-900">{pendingCount}</span>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-3">
             <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <AlertCircle size={18} />
              <h3>Exception Overrides</h3>
            </div>
            <div className="flex justify-between items-end border-b border-slate-100 pb-2 mt-1">
              <span className="text-xs text-slate-500 font-medium">Deal Anomalies (Active)</span>
              <span className="text-sm font-black text-rose-600">{anomaliesData?.count || 0}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2 py-0.5 rounded text-xs bg-slate-100 border border-slate-200 text-slate-700">Approve Discounts up to 50%</span>
            </div>
          </div>
        </div>
      );
    }
    
    if (demoRole === "finance") {
      const confirmedValue = quotes.filter(q => q.stage === "CONFIRMED").reduce((acc, q) => acc + (Number(q.grandTotal) || 0), 0);
      
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
              <CreditCard size={18} />
              <h3>Financial Overview</h3>
            </div>
            <div className="flex justify-between items-end border-b border-emerald-100 pb-2">
              <span className="text-xs text-emerald-600 font-medium">Confirmed Revenue (MTD)</span>
              <span className="text-sm font-black text-emerald-900">₹{confirmedValue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-end border-b border-emerald-100 pb-2">
              <span className="text-xs text-emerald-600 font-medium">Pending Invoices</span>
              <span className="text-sm font-black text-amber-600">4</span>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-3">
             <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <ShieldCheck size={18} />
              <h3>Finance Operations Limits</h3>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 border border-slate-200 text-slate-700">Invoice Generation</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 border border-slate-200 text-slate-700">Payment Gateway Access</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 border border-slate-200 text-slate-700">Tax Region Authority (IN, US)</span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans antialiased flex flex-col justify-between">
      {renderTopNav()}

      <main className="max-w-6xl mx-auto w-full px-4 pt-24 pb-8 sm:pt-28 sm:pb-12 flex-1">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">Profile & Workspace Identity</h1>
          <p className="text-xs text-slate-500 mt-1">Manage your account details and role-specific permissions</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Core Identity */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col items-center text-center gap-4 pb-6 border-b border-slate-100">
                <div className="w-24 h-24 rounded-full bg-[#ff5e3a] text-white font-extrabold text-3xl flex items-center justify-center shadow-lg shadow-[#ff5e3a]/25 relative">
                  {initials}
                  <div className="absolute bottom-0 right-1 w-6 h-6 rounded-full bg-emerald-500 border-4 border-white" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-900">{user.name || "Workspace User"}</h2>
                  <p className="text-sm text-slate-500">{user.email}</p>
                </div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  isDemo ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isDemo ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                  <span>{isDemo ? 'Demo Session (Mocked Role)' : 'Better Auth Session Active'}</span>
                </div>
              </div>

              {verificationAlert && (
                <div className={`mt-6 p-4 rounded-xl text-xs border ${
                  verificationAlert.type === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-800"
                }`}>
                  {verificationAlert.message}
                </div>
              )}

              <div className="mt-6 space-y-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">User ID</span>
                  <span className="text-xs font-mono text-slate-800 break-all bg-slate-50 p-2 rounded-lg block border border-slate-100">{user.id}</span>
                </div>
                
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Email Status</span>
                    <span className={`text-xs font-semibold ${user.emailVerified ? "text-emerald-600 flex items-center gap-1" : "text-amber-600"}`}>
                      {user.emailVerified && <CheckCircle2 size={14}/>}
                      {user.emailVerified ? "Verified" : "Pending Verification"}
                    </span>
                  </div>
                  {!user.emailVerified && !isDemo && (
                    <button
                      type="button"
                      onClick={handleSendVerificationEmail}
                      disabled={sendingVerification}
                      className="px-3 py-1.5 rounded-lg bg-[#ff5e3a] text-white text-xs font-semibold hover:bg-[#ea4e28] transition cursor-pointer disabled:opacity-50"
                    >
                      {sendingVerification ? "Sending..." : "Verify"}
                    </button>
                  )}
                </div>

                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Assigned Role</span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold uppercase border border-slate-200">
                    {demoRole || "Standard User"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Role Context */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                <Briefcase size={20} className="text-[#ff5e3a]"/>
                Workspace Context & Metrics
              </h3>
              
              {renderRoleData()}
              
              <div className="flex flex-wrap items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loggingOut}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-xs transition cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-4 text-center border-t border-slate-200 bg-white text-xs text-slate-400">
        DealFlow360 Orchestration Platform &copy; 2025
      </footer>
    </div>
  );
}
