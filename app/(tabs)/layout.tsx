import Link from "next/link";
import { BottomNav } from "../bottom-nav";
import { SignOutButton } from "../sign-out-button";
import { ThemeToggle } from "../theme-toggle";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between px-5 pb-2 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <Link href="/" className="flex h-11 items-center pr-3 text-lg font-semibold">
          Hearth
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <BottomNav />
    </div>
  );
}
