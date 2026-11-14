"use client";

import { useActionState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/kit/button";
import { Field } from "@/components/kit/field";
import { signIn } from "./actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(signIn, null);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center pl-5 pr-[22px] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        <p className="text-[13px] font-semibold text-muted">Our household</p>
        <h1 className="mb-8 font-display text-[44px] font-bold leading-none tracking-[-1.5px]">Hearth</h1>

        <form action={action} className="flex flex-col gap-4 rounded-card border-2 border-edge-hero bg-surface p-4 text-fg shadow-hero">
          <Field label="Email" name="email" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" required />
          <Field label="Password" name="password" type="password" autoComplete="current-password" required />

          {error && (
            <p role="alert" className="text-xs font-semibold text-error-text">
              {error}
            </p>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </motion.div>
    </main>
  );
}
