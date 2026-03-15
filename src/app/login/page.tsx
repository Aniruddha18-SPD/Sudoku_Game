"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      if (result.error === "EMAIL_NOT_VERIFIED") {
        setError("Please verify your email before signing in.");
      } else {
        setError("Invalid email or password.");
      }
    } else {
      window.location.href = "/";
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-blush flex items-center justify-center px-6">
      <div className="w-full max-w-md card-soft">
        <h1 className="text-3xl font-display">Welcome back</h1>
        <p className="text-sm text-ink/70 mt-2">Sign in to save scores and history.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              className="input-soft"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              type="password"
              className="input-soft"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <button
          className="btn-outline w-full mt-3"
          onClick={() => signIn("google")}
          type="button"
        >
          Sign in with Google
        </button>

        <div className="mt-4 flex justify-between text-sm">
          <Link href="/register" className="link-soft">Create account</Link>
          <Link href="/reset" className="link-soft">Forgot password?</Link>
        </div>
      </div>
    </main>
  );
}
