"use client";

import { useState } from "react";
import { Button } from "@/components/kit/button";
import { Card } from "@/components/kit/card";
import { Field } from "@/components/kit/field";
import { Segmented } from "@/components/kit/selection";
import { InstallHint } from "@/components/install-hint";
import { useTheme, type ThemeChoice } from "@/components/theme";
import { Face, Page, PageHeader, Section } from "@/components/ui";
import { useStore } from "@/lib/store";
import { signOut } from "./actions";

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function SettingsPage() {
  const s = useStore();
  const { choice, setTheme } = useTheme();
  const [error, setError] = useState<string | null>(null);

  return (
    <Page>
      <PageHeader kicker="Just us two" title="Settings" />

      <InstallHint />

      <Section title="Us">
        {s.members.map((m) =>
          m.id === s.me ? (
            <Card key={m.id} className="flex items-start gap-3">
              <Face member={m} size={48} />
              <div className="flex-1">
                <Field
                  key={m.name /* reset the draft if a save is rolled back */}
                  label="Your name"
                  defaultValue={m.name}
                  maxLength={30}
                  error={error ?? undefined}
                  onBlur={async (e) => e.target.value.trim() !== m.name && setError(await s.updateMe({ name: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                />
              </div>
            </Card>
          ) : (
            <Card key={m.id} className="flex items-center gap-3">
              <Face member={m} size={48} />
              <span className="flex flex-col">
                <span className="font-display text-[17px] font-bold">{m.name}</span>
                <span className="text-xs font-semibold text-muted">Only {m.name} can change this</span>
              </span>
            </Card>
          ),
        )}
      </Section>

      <Section title="Theme">
        <Segmented label="Theme" value={choice} onChange={setTheme} options={THEMES} />
      </Section>

      <form action={signOut}>
        <Button type="submit" variant="secondary" className="w-full">
          Sign out
        </Button>
      </form>
      <p className="text-center text-xs font-semibold text-muted">Bills are still sample data</p>
    </Page>
  );
}
