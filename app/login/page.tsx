"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcode || "mab" })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Invalid passcode.");
      }

      // Cookie is set by the API — hard navigate to force middleware to pick it up.
      window.location.href = "/today";
    } catch (err) {
      setErrorMessage((err as Error).message || "Login failed.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-xs uppercase tracking-[0.35em] text-mab-gold">Secure Access</p>
      <h1 className="text-3xl font-semibold text-mab-navy">MAB AI Strategies CRM</h1>
      <p className="text-sm text-mab-slate">Enter your passcode to continue.</p>
      <div className="w-full max-w-sm space-y-3">
        <input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
          placeholder="Passcode (default: mab)"
          aria-label="Passcode"
          className="w-full rounded-xl border border-mab-navy/10 bg-white px-4 py-3 text-sm text-mab-ink shadow-sm focus:border-mab-gold focus:outline-none"
        />
        {errorMessage && (
          <p className="text-xs text-red-600" role="alert">{errorMessage}</p>
        )}
        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-full bg-mab-navy px-5 py-3 text-sm font-medium text-white shadow-glow transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Enter Workspace"}
        </button>
      </div>
    </div>
  );
}
