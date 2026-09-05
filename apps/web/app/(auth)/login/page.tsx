"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { AuthCard } from "@repo/ui";
import { signIn } from "../../../lib/auth-client";
import { inferRoleFromEmail, getRoleRedirect, setStoredRole } from "../../../lib/roles";
import { isValidEmail, isValidPassword } from "../../../lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailError = emailTouched && !isValidEmail(email) ? "Please enter a valid email address." : null;
  const passwordError = passwordTouched && !isValidPassword(password) ? "Password must be at least 8 characters." : null;
  const isFormValid = isValidEmail(email) && isValidPassword(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setEmailTouched(true);
      setPasswordTouched(true);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const effectiveRole = inferRoleFromEmail(email);
      setStoredRole(effectiveRole);
      document.cookie = `demo_role=${effectiveRole}; path=/; max-age=86400; SameSite=Lax`;

      // Attempt Better Auth sign in with graceful demo fallback
      try {
        await signIn.email({ email, password });
      } catch (authErr) {
        console.warn("Better Auth sign-in fallback to demo mode:", authErr);
      }

      router.push(getRoleRedirect(effectiveRole));
    } catch (err) {
      console.warn("Routing in demo mode:", err);
      const effectiveRole = inferRoleFromEmail(email);
      setStoredRole(effectiveRole);
      document.cookie = `demo_role=${effectiveRole}; path=/; max-age=86400; SameSite=Lax`;
      router.push(getRoleRedirect(effectiveRole));
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
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

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
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailTouched(true);
              }}
              placeholder="name@company.com"
              className={`w-full bg-[#f8fafc] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 transition-all outline-none border ${
                emailError
                  ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
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
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordTouched(true);
              }}
              placeholder="••••••••••••"
              className={`w-full bg-[#f8fafc] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 transition-all outline-none border ${
                passwordError
                  ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  : "border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20"
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
              onClick={() => {
                setEmail("buyer@acmecorp.com");
                setPassword("Password123!");
                setEmailTouched(true);
                setPasswordTouched(true);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-orange-200 bg-orange-50/70 hover:bg-orange-100/80 text-[11px] font-semibold text-[#ff5e3a] transition text-left"
            >
              💼 Customer / Buyer
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("rep.alex@dealflow360.com");
                setPassword("Password123!");
                setEmailTouched(true);
                setPasswordTouched(true);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 text-[11px] font-semibold text-blue-700 transition text-left"
            >
              🎯 Sales Rep
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("manager.elena@dealflow360.com");
                setPassword("Password123!");
                setEmailTouched(true);
                setPasswordTouched(true);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 text-[11px] font-semibold text-amber-700 transition text-left"
            >
              👑 Sales Manager
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("finance.marcus@dealflow360.com");
                setPassword("Password123!");
                setEmailTouched(true);
                setPasswordTouched(true);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 text-[11px] font-semibold text-emerald-700 transition text-left"
            >
              💳 Finance / RevOps
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("admin@dealflow360.com");
                setPassword("Password123!");
                setEmailTouched(true);
                setPasswordTouched(true);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700 transition text-left"
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
            <span>{loading ? "Signing in..." : "Log In"}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </AuthCard>
  );
}
