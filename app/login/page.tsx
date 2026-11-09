"use client";

import { useState, type FormEvent } from "react";
import { Button, Input } from "@heroui/react";
import { createClient } from "@/lib/supabase/client";

const inputClass = "h-14 px-4 text-lg";
const buttonClass = "h-14 text-lg";

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
    <main className="flex min-h-dvh flex-col">
      <div className="plate justify-center">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6 p-6">
      <h1 className="text-4xl font-semibold tracking-tight">Hearth</h1>

      {codeSent ? (
        <form onSubmit={verifyCode} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span>Enter the 6-digit code sent to {email.trim()}</span>
            <Input
              fullWidth
              className={`${inputClass} tracking-widest`}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              autoFocus
            />
          </label>
          <Button type="submit" fullWidth className={buttonClass} isDisabled={busy}>
            {busy ? "Checking…" : "Sign in"}
          </Button>
          <button
            type="button"
            className="h-12 w-full text-muted"
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
            <Input
              fullWidth
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
          <Button type="submit" fullWidth className={buttonClass} isDisabled={busy}>
            {busy ? "Sending…" : "Send code"}
          </Button>
        </form>
      )}

      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      </div>
      </div>
    </main>
  );
}
