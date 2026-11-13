"use client";

import { useActionState } from "react";
import { motion } from "motion/react";
import { Tape } from "@/components/ui";
import { signIn } from "./actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(signIn, null);

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        <p className="font-hand text-sm text-accent">our little household journal</p>
        <h1 className="mt-1 mb-10 font-serif text-6xl font-medium tracking-tight [font-variation-settings:'SOFT'_100]">Hearth</h1>

        <form action={action} className="relative space-y-4 rounded-[1.1rem_0.85rem_1.2rem_0.95rem] border border-line bg-card p-6 pt-8 shadow-[0_10px_24px_-18px_rgba(40,50,30,0.35)]">
          <Tape className="left-8 rotate-[-4deg]" />
          <label className="block">
            <span className="font-hand text-xs text-ink-soft">email</span>
            <input
              name="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              required
              className="mt-1 block min-h-12 w-full border-b border-line bg-transparent text-base outline-none focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="font-hand text-xs text-ink-soft">password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 block min-h-12 w-full border-b border-line bg-transparent text-base outline-none focus:border-accent"
            />
          </label>

          {error && (
            <p role="alert" className="font-hand text-sm text-[#c0675f]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 min-h-12 w-full rounded-full bg-ink font-semibold text-paper transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {pending ? "Opening…" : "Open the journal"}
          </button>
        </form>
      </motion.div>
    </main>
  );
}
