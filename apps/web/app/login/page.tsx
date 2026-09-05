"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "../../lib/auth-client";
import styles from "../auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await signIn.email({
        email,
        password,
      });

      if (response.error) {
        setError(response.error.message || "Failed to sign in. Please check your credentials.");
      } else {
        router.push("/profile");
      }
    } catch (err) {
      setError((err as Error).message || "An unexpected connection error occurred.");
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
            Direct Cross-Origin Auth
          </div>
          <h1 className={styles.title}>Welcome Back</h1>
          <p className={styles.subtitle}>
            Sign in to access your dashboard and background compute jobs
          </p>
        </div>

        {error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

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

          <div className={styles.formGroup}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className={styles.label} htmlFor="password">
                Password
              </label>
              <Link href="/forgot-password" className={styles.link} style={{ fontSize: "0.775rem" }}>
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? <div className={styles.spinner}></div> : "Sign In"}
          </button>
        </form>

        <div className={styles.divider}>or</div>

        <div className={styles.footer}>
          Don&apos;t have an account yet?{" "}
          <Link href="/register" className={styles.link}>
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
