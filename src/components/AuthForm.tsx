"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
export default function AuthForm({ signup = false }: { signup?: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <main className="auth-page">
      <Link className="brand" href="/">
        <span className="brand-mark">✓</span>TestMyVibe
      </Link>
      <div className="auth-card">
        <div className="eyebrow">YOUR QUALITY WORKSPACE</div>
        <h1>{signup ? "Build with confidence." : "Welcome back."}</h1>
        <p>
          {signup
            ? "Create an account and your own private workspace."
            : "Sign in to review your projects and audit queue."}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const data = Object.fromEntries(new FormData(e.currentTarget));
            try {
              const res = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...data,
                  mode: signup ? "signup" : "login",
                }),
              });
              const result = await res.json();
              if (!res.ok) throw new Error(result.error);
              router.push("/dashboard");
              router.refresh();
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Unable to connect. Try again.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {signup && (
            <>
              <label>
                Your name
                <input
                  className="input"
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={80}
                />
              </label>
              <label>
                Workspace name
                <input
                  className="input"
                  name="workspace"
                  placeholder="e.g. Acme engineering"
                  required
                  maxLength={80}
                />
              </label>
            </>
          )}
          <label>
            Email
            <input
              className="input"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              className="input"
              name="password"
              type="password"
              autoComplete={signup ? "new-password" : "current-password"}
              minLength={12}
              maxLength={128}
              required
            />
          </label>
          {signup && <small>Use at least 12 characters.</small>}
          {error && (
            <p className="text-red-400" role="alert">
              {error}
            </p>
          )}
          <button className="btn-primary" disabled={busy}>
            {busy
              ? "Please wait…"
              : signup
                ? "Create workspace →"
                : "Sign in →"}
          </button>
        </form>
        <p>
          {signup ? "Already have an account? " : "New to TestMyVibe? "}
          <Link href={signup ? "/login" : "/signup"}>
            {signup ? "Sign in" : "Create a workspace"}
          </Link>
        </p>
      </div>
      <small>Private projects. Project-scoped AI access.</small>
    </main>
  );
}
