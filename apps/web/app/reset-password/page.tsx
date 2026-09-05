"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../auth.module.css";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get("token");
      const urlError = params.get("error");

      if (urlError === "INVALID_TOKEN") {
        setTokenError("This password reset link is invalid or has expired. Please request a new one.");
      } else if (!urlToken) {
        setTokenError("Missing password reset token. Please request a new recovery link.");
      } else {
        setToken(urlToken);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Reset token is missing. Please request a new recovery link.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${apiUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          newPassword: password,
          token,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to reset password. The link may have expired.");
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
            Security Credentials
          </div>
          <h1 className={styles.title}>Set New Password</h1>
          <p className={styles.subtitle}>
            Enter and confirm your new password below to regain access to your account.
          </p>
        </div>

        {tokenError && (
          <div>
            <div className={`${styles.alert} ${styles.alertError}`} style={{ marginBottom: "1.5rem" }}>
              <span>⚠️</span>
              <span>{tokenError}</span>
            </div>
            <Link
              href="/forgot-password"
              className={styles.button}
              style={{ textDecoration: "none" }}
            >
              Request New Recovery Link
            </Link>
          </div>
        )}

        {!tokenError && error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {!tokenError && submitted && (
          <div>
            <div className={`${styles.alert} ${styles.alertSuccess}`} style={{ marginBottom: "1.5rem" }}>
              <span>🎉</span>
              <span>Your password has been successfully reset! You can now sign in with your new credentials.</span>
            </div>
            <Link
              href="/login"
              className={styles.button}
              style={{ textDecoration: "none" }}
            >
              Sign In with New Password
            </Link>
          </div>
        )}

        {!tokenError && !submitted && (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="password">
                New Password
              </label>
              <input
                id="password"
                type="password"
                className={styles.input}
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className={styles.input}
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? <div className={styles.spinner}></div> : "Update Password"}
            </button>

            <div className={styles.footer}>
              Remembered your password?{" "}
              <Link href="/login" className={styles.link}>
                Sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
