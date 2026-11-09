"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "h-14 w-full rounded-xl border border-zinc-300 bg-transparent px-4 text-lg dark:border-zinc-700";
const buttonClass =
  "h-14 w-full rounded-xl bg-foreground text-lg font-semibold text-background disabled:opacity-50";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (error) {
      setError(
        error.status === 429
          ? "Too many codes requested. Please wait a while and try again."
          : (error.status ?? 500) >= 500
            ? "The email service failed. Please try again shortly."
            : "Couldn't send a code. Check the email address.",
      );
      return;
    }
    setCode("");
    setCodeSent(true);
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    if (error) {
      setBusy(false);
      setError("That code didn't work. Check it or request a new one.");
      return;
    }
    // Full navigation so proxy.ts sees the new session cookie.
    window.location.replace("/");
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
      <h1 className="text-3xl font-semibold">Hearth</h1>

      {codeSent ? (
        <form onSubmit={verifyCode} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span>Enter the 6-digit code sent to {email.trim()}</span>
            <input
              className={`${inputClass} tracking-widest`}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              autoFocus
            />
          </label>
          <button className={buttonClass} disabled={busy}>
            {busy ? "Checking…" : "Sign in"}
          </button>
          <button
            type="button"
            className="h-12 w-full"
            onClick={() => {
              setCodeSent(false);
              setError("");
            }}
          >
            Use a different email or resend
          </button>
        </form>
      ) : (
        <form onSubmit={sendCode} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span>Email</span>
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              required
              autoFocus
            />
          </label>
          <button className={buttonClass} disabled={busy}>
            {busy ? "Sending…" : "Send code"}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </main>
  );
}
