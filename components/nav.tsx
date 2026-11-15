"use client";

import { CalendarDays, HandHeart, House, ListChecks, ShoppingCart, Sparkles, Sprout } from "lucide-react";
import { TabBar } from "@/components/kit/nav";

/** One tab per feature, icons only so all get a full 44pt target. Home is the raised button in the middle:
 *  planning and lists on its left, the house and ourselves on its right. */
const TABS = [
  { href: "/calendar", label: "Calendar", icon: <CalendarDays strokeWidth={2.2} /> },
  { href: "/todo", label: "To-do", icon: <ListChecks strokeWidth={2.2} /> },
  { href: "/shopping", label: "Shopping", icon: <ShoppingCart strokeWidth={2.2} /> },
  { href: "/", label: "Home", icon: <House strokeWidth={2.2} />, raised: true },
  { href: "/chores", label: "Chores", icon: <Sparkles strokeWidth={2.2} /> },
  { href: "/habits", label: "Habits", icon: <Sprout strokeWidth={2.2} /> },
  { href: "/doa", label: "Doa", icon: <HandHeart strokeWidth={2.2} /> },
];

export function Nav() {
  return <TabBar tabs={TABS} />;
}
