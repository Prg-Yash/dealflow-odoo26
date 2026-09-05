"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, Mail, AlertCircle, Loader2, X } from "lucide-react";
import { AuthCard, useToast } from "@repo/ui";
import { signIn } from "../../../lib/auth-client";
import { inferRoleFromEmail, getRoleRedirect, setStoredRole, type UserRole } from "../../../lib/roles";
import { isValidEmail, isValidPassword } from "../../../lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authFailed, setAuthFailed] = useState(false);
  const [activePill, setActivePill] = useState<string | null>(null);

  const emailError = emailTouched && !isValidEmail(email) ? "Please enter a valid email address." : null;
  const passwordError = passwordTouched && !isValidPassword(password) ? "Password must be at least 8 characters." : null;
  const isFormValid = isValidEmail(email) && isValidPassword(password);

  const handleFieldChange = (field: "email" | "password", value: string) => {
    if (field === "email") {
      setEmail(value);
      setEmailTouched(true);
    } else {
      setPassword(value);
      setPasswordTouched(true);
    }
    // Clear global error and field error state on active typing
    if (error || authFailed) {
      setError(null);
      setAuthFailed(false);
    }
  };

  const handleSelectTestRole = (id: string, label: string, testEmail: string) => {
    setActivePill(id);
    setEmail(testEmail);
    setPassword("Password123!");
    setEmailTouched(true);
    setPasswordTouched(true);
    setError(null);
    setAuthFailed(false);
    toast.info(
      "Test Credentials Loaded",
      `Filled demo credentials for ${label} (${testEmail}). Click "Log In" to proceed.`
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setEmailTouched(true);
      setPasswordTouched(true);
      return;
    }

    setError(null);
    setAuthFailed(false);
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      // 1. Authenticate with Better Auth credentials
      const res = await signIn.email({
        email: normalizedEmail,
        password,
      });

      if (res?.error) {
        // Authentication failed (invalid password or user not found)
        const errMsg = res.error.message || "Invalid email or password.";
        setError(errMsg);
        setAuthFailed(true);
        if (typeof window !== "undefined") {
          localStorage.removeItem("df360_user_role");
          document.cookie = "demo_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
        toast.error(
          "Authentication Failed",
          "The password you entered is incorrect or user does not exist. Please check your credentials."
        );
        setLoading(false);
        return;
      }

      // 2. Authentication succeeded! Fetch real authenticated user identity and database role
      toast.success(
        "Signed in successfully",
        "Welcome back! Loading your workspace..."
      );

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      let userRole: UserRole = "sales_rep";

      try {
        const meRes = await fetch(`${apiUrl}/api/auth/me`, {
          credentials: "include",
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          const dbRole = meData?.user?.role;
          if (dbRole === "ADMIN") userRole = "admin";
          else if (dbRole === "SALES_MANAGER") userRole = "manager";
          else if (dbRole === "SALES_REP") userRole = "sales_rep";
          else if (dbRole === "FINANCE_OPS") userRole = "finance";
          else if (dbRole === "CUSTOMER") userRole = "customer";
          else userRole = inferRoleFromEmail(normalizedEmail);
        } else {
          userRole = inferRoleFromEmail(normalizedEmail);
        }
      } catch {
        userRole = inferRoleFromEmail(normalizedEmail);
      }

      // 3. Persist verified role and redirect to the verified role's dashboard or portal
      setStoredRole(userRole);
      document.cookie = `demo_role=${userRole}; path=/; max-age=86400; SameSite=Lax`;

      router.push(getRoleRedirect(userRole));
    } catch (err: any) {
      console.error("Login submission error:", err);
      const errMsg = err?.message || "Invalid email or password. Please check your credentials.";
      setError(errMsg);
      setAuthFailed(true);
      if (typeof window !== "undefined") {
        localStorage.removeItem("df360_user_role");
        document.cookie = "demo_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
      toast.error(
        "Sign In Error",
        errMsg
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Welcome Back"
      description="Sign in to orchestrate deals, approvals & revenue"
      activeTab="login"
      linkComponent={Link}
      footerNote={
        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Don&apos;t have an account yet?{" "}
            <Link href="/register" className="text-[#ff5e3a] hover:underline font-semibold transition ml-0.5">
              Create an account
            </Link>
          </p>
        </div>
      }
    >
      {/* Login Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-left">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="userEmail">
            Email Address <span className="text-[#ff5e3a]">*</span>
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="userEmail"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => handleFieldChange("email", e.target.value)}
              placeholder="name@company.com"
              className={`w-full bg-[#f8fafc] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 transition-all outline-none border ${
                emailError
                  ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  : authFailed
                  ? "border-red-300 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20"
                  : "border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20"
              }`}
            />
          </div>
          {emailError && <span className="text-[11px] text-red-500 font-medium">{emailError}</span>}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="userPassword">
              Password <span className="text-[#ff5e3a]">*</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-[11px] text-slate-500 hover:text-[#ff5e3a] transition-colors font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="userPassword"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => handleFieldChange("password", e.target.value)}
              placeholder="••••••••••••"
              className={`w-full rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 transition-all outline-none border ${
                authFailed
                  ? "bg-red-50/40 border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  : passwordError
                  ? "bg-[#f8fafc] border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  : "bg-[#f8fafc] border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {passwordError && <span className="text-[11px] text-red-500 font-medium">{passwordError}</span>}
        </div>

        {/* Quick Role Tester Pills */}
        <div className="pt-1 pb-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
            Quick Test Credentials (1-Click Fill)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleSelectTestRole("buyer", "Customer / Buyer", "buyer@acmecorp.com")}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition text-left cursor-pointer ${
                activePill === "buyer"
                  ? "border-[#ff5e3a] bg-orange-100 text-[#ea4e28] ring-1 ring-[#ff5e3a]"
                  : "border-orange-200 bg-orange-50/70 hover:bg-orange-100/80 text-[#ff5e3a]"
              }`}
            >
              💼 Customer / Buyer
            </button>
            <button
              type="button"
              onClick={() => handleSelectTestRole("rep", "Sales Rep", "rep.alex@dealflow360.com")}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition text-left cursor-pointer ${
                activePill === "rep"
                  ? "border-blue-500 bg-blue-100 text-blue-800 ring-1 ring-blue-400"
                  : "border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 text-blue-700"
              }`}
            >
              🎯 Sales Rep
            </button>
            <button
              type="button"
              onClick={() => handleSelectTestRole("manager", "Sales Manager", "manager.elena@dealflow360.com")}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition text-left cursor-pointer ${
                activePill === "manager"
                  ? "border-amber-500 bg-amber-100 text-amber-800 ring-1 ring-amber-400"
                  : "border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 text-amber-700"
              }`}
            >
              👑 Sales Manager
            </button>
            <button
              type="button"
              onClick={() => handleSelectTestRole("finance", "Finance / RevOps", "finance.marcus@dealflow360.com")}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition text-left cursor-pointer ${
                activePill === "finance"
                  ? "border-emerald-500 bg-emerald-100 text-emerald-800 ring-1 ring-emerald-400"
                  : "border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-700"
              }`}
            >
              💳 Finance / RevOps
            </button>
            <button
              type="button"
              onClick={() => handleSelectTestRole("admin", "System Admin", "admin@dealflow360.com")}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition text-left cursor-pointer ${
                activePill === "admin"
                  ? "border-slate-500 bg-slate-200 text-slate-900 ring-1 ring-slate-400"
                  : "border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              ⚙️ System Admin
            </button>
          </div>
        </div>

        {/* Action Row */}
        <div className="pt-2 flex flex-col gap-2">
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white font-semibold text-sm transition-all shadow-md shadow-[#ff5e3a]/25 active:translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>Authenticating credentials...</span>
              </>
            ) : (
              <>
                <span>Log In</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </form>
    </AuthCard>
  );
}
