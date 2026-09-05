"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../auth.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      // Request password reset via Better Auth endpoint on standalone API
      const res = await fetch(`${apiUrl}/api/auth/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to submit password reset request.");
      }

      setSubmitted(true);
    } catch (err) {
      setError((err as Error).message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.authCard}>
        <div className={styles.header}>
          <div className={styles.badge}>
            <span className={styles.badgeDot}></span>
            Account Recovery
          </div>
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.subtitle}>
            Enter the email associated with your account and we&apos;ll send recovery instructions.
          </p>
        </div>

        {error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {submitted ? (
          <div>
            <div className={`${styles.alert} ${styles.alertSuccess}`}>
              <span>📬</span>
              <span>
                If an account exists for <strong>{email}</strong>, password reset instructions have been dispatched.
              </span>
            </div>
            <Link
              href="/login"
              className={styles.button}
              style={{ textDecoration: "none", marginTop: "1.5rem" }}
            >
              Return to Sign In
            </Link>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className={styles.input}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? <div className={styles.spinner}></div> : "Send Recovery Link"}
            </button>
          </form>
        )}

        <div className={styles.divider}>or</div>

        <div className={styles.footer}>
          Remember your password?{" "}
          <Link href="/login" className={styles.link}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
