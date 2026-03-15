"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function VerifyPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");

    if (!token) {
      setStatus("error");
      return;
    }

    fetch(`/api/auth/verify?token=${token}`)
      .then((res) => {
        setStatus(res.ok ? "success" : "error");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <main className="min-h-screen bg-blush flex items-center justify-center px-6">
      <div className="w-full max-w-md card-soft text-center">
        <h1 className="text-3xl font-display">Email verification</h1>
        {status === "loading" ? <p className="mt-4">Verifying your email...</p> : null}
        {status === "success" ? (
          <p className="mt-4 text-green-700">Your email is verified. You can sign in now.</p>
        ) : null}
        {status === "error" ? (
          <p className="mt-4 text-red-600">Verification link is invalid or expired.</p>
        ) : null}
        <Link href="/login" className="link-soft mt-6 inline-block">
          Go to sign in
        </Link>
      </div>
    </main>
  );
}
