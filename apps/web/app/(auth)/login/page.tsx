"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, Mail, Users } from "lucide-react";
import { AuthCard } from "@repo/ui";
import { signIn } from "../../../lib/auth-client";
import { ROLES, ALL_ROLES, inferRoleFromEmail, getRoleRedirect, setStoredRole, type UserRole } from "../../../lib/roles";
import { isValidEmail, isValidPassword } from "../../../lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("rep.alex@dealflow360.com");
  const [password, setPassword] = useState("Password123!");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("sales_rep");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailError = emailTouched && !isValidEmail(email) ? "Please enter a valid email address." : null;
  const passwordError = passwordTouched && !isValidPassword(password) ? "Password must be at least 8 characters." : null;
  const isFormValid = isValidEmail(email) && isValidPassword(password);

  const handleRoleSelect = (roleKey: UserRole) => {
    const roleConfig = ROLES[roleKey];
    setSelectedRole(roleKey);
    setEmail(roleConfig.defaultEmail);
    setPassword("Password123!");
    setEmailTouched(false);
    setPasswordTouched(false);
    setError(null);
  };

  const handleEmailChange = (newEmail: string) => {
    setEmail(newEmail);
    setEmailTouched(true);
    const inferred = inferRoleFromEmail(newEmail);
    setSelectedRole(inferred);
  };

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
      {/* 5-User Role Quick Selector */}
      <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Users size={14} className="text-[#ff5e3a]" />
            Demo User Credentials (Click to prefill):
          </span>
          <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
            Password: Password123!
          </span>
          <span className="text-[10px] text-slate-400 font-normal">Click to fill</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1">
          {ALL_ROLES.map((r) => {
            const isActive = selectedRole === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleRoleSelect(r.id)}
                className={`px-1.5 py-1 rounded-lg text-[11px] font-medium text-center transition-all cursor-pointer truncate ${
                  isActive
                    ? "bg-[#0f172a] text-white shadow-xs font-semibold"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
                title={`${r.title} — ${r.defaultEmail}`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/60 mt-0.5">
          <span className="truncate">
            User: <strong className="text-slate-800">{ROLES[selectedRole]?.defaultName}</strong> &bull; <span className="font-mono text-slate-600">{ROLES[selectedRole]?.defaultEmail}</span>
          </span>
          <span className="text-[#ff5e3a] font-medium shrink-0 ml-2">
            Role: {ROLES[selectedRole]?.label}
          </span>
        </div>
      </div>

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
              onChange={(e) => handleEmailChange(e.target.value)}
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

        {/* Action Row */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white font-semibold text-sm transition-all shadow-md shadow-[#ff5e3a]/25 active:translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{loading ? "Signing in..." : "Log In"}</span>
            <ArrowRight size={16} />
          </button>

          <div className="text-center">
            <Link
              href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`}
              className="text-xs text-slate-500 hover:text-[#ff5e3a] transition-colors font-medium"
            >
              Forgot Password?
            </Link>
          </div>
        </div>
      </form>
    </AuthCard>
  );
}
