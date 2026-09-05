"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, User, Mail, Building2, Lock } from "lucide-react";
import { AuthCard } from "@repo/ui";
import { signUp } from "../../../lib/auth-client";
import { ALL_ROLES, setStoredRole, getRoleRedirect, type UserRole } from "../../../lib/roles";
import { isValidEmail, isValidPassword, isValidName } from "../../../lib/validation";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState<UserRole>("sales_rep");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [companyTouched, setCompanyTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameError = nameTouched && !isValidName(fullName) ? "Name must be at least 2 characters." : null;
  const emailError = emailTouched && !isValidEmail(workEmail) ? "Please enter a valid work email address." : null;
  const companyError = companyTouched && !isValidName(companyName) ? "Company name must be at least 2 characters." : null;
  const passwordError = passwordTouched && !isValidPassword(password) ? "Password must be at least 8 characters." : null;

  const isFormValid = isValidName(fullName) && isValidEmail(workEmail) && isValidName(companyName) && isValidPassword(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setNameTouched(true);
      setEmailTouched(true);
      setCompanyTouched(true);
      setPasswordTouched(true);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      setStoredRole(role);

      // Attempt Better Auth sign up with graceful demo fallback
      try {
        await signUp.email({
          email: workEmail,
          password,
          name: fullName,
        });
      } catch (authErr) {
        console.warn("Better Auth sign up fallback to demo mode:", authErr);
      }

      router.push(getRoleRedirect(role));
    } catch (err) {
      console.warn("Backend unavailable, fallback to demo mode:", err);
      setStoredRole(role);
      router.push(getRoleRedirect(role));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Create Account"
      description="Join DealFlow360 to collaborate on deals and quotations"
      activeTab="signup"
      linkComponent={Link}
      footerNote={
        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-[#ff5e3a] hover:underline font-semibold transition ml-0.5">
              Log In
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

      {/* Form Elements */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-left">
        {/* Full Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="fullName">
            Full Name <span className="text-[#ff5e3a]">*</span>
          </label>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setNameTouched(true);
              }}
              placeholder="Sarah Jenkins"
              className={`w-full bg-[#f8fafc] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 outline-none transition-all border ${
                nameError
                  ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  : "border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20"
              }`}
            />
          </div>
          {nameError && <span className="text-[11px] text-red-500 font-medium">{nameError}</span>}
        </div>

        {/* Work Email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="workEmail">
            Work Email <span className="text-[#ff5e3a]">*</span>
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="workEmail"
              type="email"
              required
              value={workEmail}
              onChange={(e) => {
                setWorkEmail(e.target.value);
                setEmailTouched(true);
              }}
              placeholder="s.jenkins@acmetechnologies.com"
              className={`w-full bg-[#f8fafc] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 outline-none transition-all border ${
                emailError
                  ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  : "border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20"
              }`}
            />
          </div>
          {emailError && <span className="text-[11px] text-red-500 font-medium">{emailError}</span>}
        </div>

        {/* Company Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="companyName">
            Company Name <span className="text-[#ff5e3a]">*</span>
          </label>
          <div className="relative">
            <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="companyName"
              type="text"
              required
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                setCompanyTouched(true);
              }}
              placeholder="Acme Technologies, Inc."
              className={`w-full bg-[#f8fafc] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 outline-none transition-all border ${
                companyError
                  ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  : "border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20"
              }`}
            />
          </div>
          {companyError && <span className="text-[11px] text-red-500 font-medium">{companyError}</span>}
        </div>

        {/* Platform Role Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="roleSelect">
            Platform Role <span className="text-[#ff5e3a]">*</span>
          </label>
          <select
            id="roleSelect"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full bg-[#f8fafc] border border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20 rounded-xl px-3.5 py-2.5 text-sm text-[#0f172a] outline-none transition-all cursor-pointer"
          >
            {ALL_ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label} ({r.title})
              </option>
            ))}
          </select>
        </div>

        {/* Create Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="password">
            Create Password <span className="text-[#ff5e3a]">*</span>
          </label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordTouched(true);
              }}
              placeholder="••••••••••••"
              className={`w-full bg-[#f8fafc] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 outline-none transition-all border ${
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

        {/* Submit Action */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white font-semibold text-sm transition-all shadow-md shadow-[#ff5e3a]/25 active:translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{loading ? "Creating account..." : "Create Account"}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </AuthCard>
  );
}
