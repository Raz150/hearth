"use client";

import { Card } from "@heroui/react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { klDate } from "@/lib/plan-dates";
import { createClient } from "@/lib/supabase/client";
import { Sample } from "./fridge-samples";

const timeZone = "Asia/Kuala_Lumpur";

type Todo = { id: string; text: string; planned_for: string | null; created_at: string };

function greetingFor(now: Date) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function TodoCard({ todos, today }: { todos: Todo[] | null; today: string }) {
  // Missed items roll forward into Today, matching the To-do tab.
  const forToday = (todos ?? [])
    .filter((todo) => todo.planned_for && todo.planned_for <= today)
    .sort((a, b) => a.planned_for!.localeCompare(b.planned_for!) || a.created_at.localeCompare(b.created_at));
  const left = todos?.length ?? 0;

  return (
    <Link href="/todo" className="block aspect-square rounded-3xl transition-transform active:scale-[0.98]">
      <Card className="h-full gap-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-muted">To-do</h2>
          <ChevronRight aria-hidden="true" className="size-5 text-muted" />
        </div>
        {todos && (
          <p className="mt-auto flex items-baseline gap-1.5">
            <span className="text-4xl font-semibold tracking-tight">{forToday.length || left}</span>
            <span className="text-muted">{forToday.length ? "for today" : "left"}</span>
          </p>
        )}
      </Card>
    </Link>
  );
}

export function HomeView() {
  const [name, setName] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  const [todos, setTodos] = useState<Todo[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const { data: auth } = await supabase.auth.getSession();
      const [member, items] = await Promise.all([
        supabase.from("household_members").select("display_name").eq("user_id", auth.session?.user.id ?? "").maybeSingle(),
        supabase.from("list_items").select("id, text, planned_for, created_at").eq("checked", false),
      ]);
      if (member.data) setName(member.data.display_name);
      if (items.data) setTodos(items.data);
      setNow(new Date());
    };
    // iOS drops the socket in the background, so catch up whenever the app returns.
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };

    load();
    document.addEventListener("visibilitychange", onVisible);
    const channel = supabase
      .channel(`home-${Math.random()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "list_items" }, () => load())
      .subscribe();

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-3">
      {now && (
        <div className="pb-5">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight [overflow-wrap:anywhere]">
            {greetingFor(now)}
            {name && `, ${name}`}
          </h1>
          <p className="mt-1 text-muted">
            {new Intl.DateTimeFormat("en-MY", { timeZone, weekday: "long", day: "numeric", month: "long" }).format(now)}
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {now && <TodoCard todos={todos} today={klDate(now)} />}
        <Sample title="Anniversary">
          <p className="flex items-baseline gap-1.5">
            <span className="text-4xl font-semibold tracking-tight">23</span>
            <span className="text-muted">days to go</span>
          </p>
        </Sample>
      </div>
    </main>
  );
}
