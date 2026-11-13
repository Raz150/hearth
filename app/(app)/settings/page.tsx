"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Moon, Sun, SunMoon } from "lucide-react";
import { Card, Page, PageHeader, Section } from "@/components/ui";
import { InstallHint } from "@/components/install-hint";
import { useTheme, type ThemeChoice } from "@/components/theme";
import { INKS, inkText, useStore } from "@/lib/store";
import { signOut } from "./actions";

const THEMES: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "Auto", icon: SunMoon },
  { value: "light", label: "Paper", icon: Sun },
  { value: "dark", label: "Night", icon: Moon },
];

export default function SettingsPage() {
  const s = useStore();
  const { choice, setTheme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const save = async (patch: { name?: string; ink?: string }) => setError(await s.updateMe(patch));

  return (
    <Page>
      <PageHeader kicker="just us two" title="Settings" />

      <InstallHint />

      <Section title="Our inks">
        <div className="space-y-3">
          {s.members.map((m) =>
            m.id === s.me ? (
              <Card key={m.id} className="p-4">
                <input
                  key={m.name /* reset the draft if a save is rolled back */}
                  defaultValue={m.name}
                  maxLength={30}
                  aria-label="Your name"
                  onBlur={(e) => e.target.value.trim() !== m.name && save({ name: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  className="w-full bg-transparent font-hand text-2xl outline-none"
                  style={{ color: inkText(m.ink) }}
                />
                <div role="radiogroup" aria-label="Your ink" className="mt-3 flex flex-wrap gap-1">
                  {INKS.map((ink) => {
                    const on = ink.hex === m.ink;
                    // Inks are one per person, so the other's colour can't be picked.
                    const owner = s.members.find((o) => o.id !== s.me && o.ink === ink.hex);
                    return (
                      <button
                        key={ink.hex}
                        role="radio"
                        aria-checked={on}
                        aria-disabled={!!owner}
                        aria-label={owner ? `${ink.name}, ${owner.name}'s ink` : ink.name}
                        onClick={() => !on && !owner && save({ ink: ink.hex })}
                        className="grid size-11 place-items-center"
                      >
                        <span
                          className={`relative grid size-8 place-items-center rounded-full ${owner ? "opacity-35" : ""}`}
                          style={{ backgroundColor: ink.hex }}
                        >
                          {on && <motion.span layoutId="ink-ring" className="absolute -inset-1.5 rounded-full border-2" style={{ borderColor: ink.hex }} />}
                          {owner && <span className="font-hand text-xs text-white">{owner.name.slice(0, 1)}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {error && <p role="alert" className="mt-2 font-hand text-xs text-[#c0675f]">{error}</p>}
              </Card>
            ) : (
              <Card key={m.id} className="flex items-center gap-3 p-4">
                <span className="size-6 rounded-full" style={{ backgroundColor: m.ink }} />
                <span className="font-hand text-xl" style={{ color: inkText(m.ink) }}>{m.name}</span>
                <span className="ml-auto font-hand text-xs text-ink-soft">only {m.name} can change this</span>
              </Card>
            ),
          )}
        </div>
      </Section>

      <Section title="Theme">
        <div role="radiogroup" className="grid grid-cols-3 gap-2">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              role="radio"
              aria-checked={choice === value}
              onClick={() => setTheme(value)}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border text-sm font-medium transition-colors ${choice === value ? "border-accent bg-accent-soft text-ink" : "border-line bg-card text-ink-soft"}`}
            >
              <Icon className="size-5" />
              {label}
            </button>
          ))}
        </div>
      </Section>

      <form action={signOut} className="mb-6">
        <button className="min-h-12 w-full rounded-full border border-line bg-card font-semibold text-ink-soft active:scale-[0.98] transition-transform">Sign out</button>
      </form>
      <p className="text-center font-hand text-xs text-ink-soft">bills are still sample data</p>
    </Page>
  );
}
