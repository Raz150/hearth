"use client";

import { BookOpen, CalendarDays, HandHeart, ListChecks, ShoppingCart, Sparkles } from "lucide-react";
import { TabBar } from "@/components/kit/nav";

const TABS = [
  { href: "/", label: "Today", icon: <BookOpen strokeWidth={2.2} /> },
  { href: "/calendar", label: "Calendar", icon: <CalendarDays strokeWidth={2.2} /> },
  { href: "/todo", label: "To-do", icon: <ListChecks strokeWidth={2.2} /> },
  { href: "/shopping", label: "Shop", icon: <ShoppingCart strokeWidth={2.2} /> },
  { href: "/chores", label: "Chores", icon: <Sparkles strokeWidth={2.2} /> },
  { href: "/doa", label: "Doa", icon: <HandHeart strokeWidth={2.2} /> },
];

export function Nav() {
  return <TabBar tabs={TABS} />;
}
