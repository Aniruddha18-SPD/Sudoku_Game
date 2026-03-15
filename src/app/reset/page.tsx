"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ResetPage() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    setToken(url.searchParams.get("token"));
  }, []);

  async function requestReset(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const response = await fetch("/api/auth/reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      setError("Unable to send reset email.");
    } else {
      setMessage("Check your email for a reset link.");
    }
  }

  async function confirmReset(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setMessage(null);

    const response = await fetch("/api/auth/reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    if (!response.ok) {
      setError("Reset link is invalid or expired.");
    } else {
      setMessage("Password updated. You can sign in now.");
    }
  }

  return (
    <main className="min-h-screen bg-blush flex items-center justify-center px-6">
      <div className="w-full max-w-md card-soft">
        <h1 className="text-3xl font-display">Reset password</h1>

        {token ? (
          <form className="mt-6 space-y-4" onSubmit={confirmReset}>
            <label className="block text-sm font-medium">
              New password
              <input
                type="password"
                className="input-soft"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {message ? <p className="text-sm text-green-700">{message}</p> : null}
            <button className="btn-primary w-full" type="submit">
              Update password
            </button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={requestReset}>
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
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {message ? <p className="text-sm text-green-700">{message}</p> : null}
            <button className="btn-primary w-full" type="submit">
              Send reset email
            </button>
          </form>
        )}

        <div className="mt-4 text-sm">
          <Link href="/login" className="link-soft">Back to sign in</Link>
        </div>
      </div>
    </main>
  );
}
