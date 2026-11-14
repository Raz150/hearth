import type { InputHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cardClass, type Level } from "./card";
import { checkboxClass } from "./selection";
import { cx, FILL, META, type Tone } from "./shared";

const TINT = {
  shopping: "bg-shopping-tint",
  chores: "bg-chores-tint",
  none: "bg-surface-sunken",
} as const;

/** List card: 42 header tinted with its category, rows below with dashed dividers. Hard shadow as in the kit reference; the home screen passes level="info". */
export function ListCard({ title, tint = "none", more, aside, level = "interactive", children }: { title: string; tint?: keyof typeof TINT; more?: { href: string; label: string }; aside?: ReactNode; level?: Level; children: ReactNode }) {
  return (
    <section className={cx(cardClass(level), "overflow-hidden")}>
      <header className={cx("flex h-[42px] items-center justify-between border-b-2 border-edge-card px-3.5", TINT[tint], tint === "shopping" ? "text-on-fill" : "text-fg" /* chores-tint is dark at night, shopping-tint stays light */)}>
        <h2 className="font-display text-[15px] font-bold">{title}</h2>
        {aside}
        {more && (
          <Link href={more.href} className="-mr-2 flex h-11 items-center px-2 text-[13px] font-bold">
            {more.label}
          </Link>
        )}
      </header>
      <div className="divide-y-[1.5px] divide-dashed divide-divider">{children}</div>
    </section>
  );
}

// Icons on shopping-tint stay dark: that tint is light in both themes.
const BOX = {
  money: "bg-[var(--money-tint)]",
  chores: "bg-chores-tint",
  shopping: "bg-shopping-tint text-on-fill",
  none: "bg-surface",
} as const;

/** 34 dashed icon box at the start of a row. */
export function IconBox({ tone = "none", children }: { tone?: keyof typeof BOX; children?: ReactNode }) {
  return (
    <span aria-hidden className={cx("flex size-[34px] shrink-0 items-center justify-center rounded-icon border-[1.5px] border-dashed border-edge-card [&_svg]:size-[18px]", BOX[tone])}>
      {children}
    </span>
  );
}

/** 54-tall checkable row; the whole row is the tap target. The icon box shows when you pass `icon` or `iconTone`. */
export function ListRow({
  title,
  meta,
  icon,
  iconTone,
  checkLabel,
  ...input
}: { title: string; meta?: ReactNode; icon?: ReactNode; iconTone?: keyof typeof BOX; checkLabel: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "title">) {
  return (
    <label className="group flex min-h-[54px] cursor-pointer items-center gap-3 px-3.5 py-2">
      {(icon || iconTone) && <IconBox tone={iconTone}>{icon}</IconBox>}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-bold transition-colors group-has-checked:text-subtle group-has-checked:line-through">{title}</span>
        {meta && <span className={META}>{meta}</span>}
      </span>
      <input type="checkbox" aria-label={checkLabel} className={checkboxClass()} {...input} />
    </label>
  );
}

/** Amounts with a peach total row. Amounts are already formatted ("RM 86.40"). */
export function ExpenseTable({ caption, rows, total, level = "interactive" }: { caption: string; rows: readonly { label: string; amount: string }[]; total: string; level?: Level }) {
  return (
    <div className={cx(cardClass(level), "overflow-hidden")}>
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <tbody className="divide-y-[1.5px] divide-dashed divide-divider">
          {rows.map((r) => (
            <tr key={r.label} className="h-[46px]">
              <th scope="row" className="px-3.5 text-left font-normal">
                {r.label}
              </th>
              <td className="px-3.5 text-right font-bold">{r.amount}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="h-[50px] border-t-2 border-edge-card bg-hero text-on-fill">
            <th scope="row" className="px-3.5 text-left font-bold">
              Total
            </th>
            <td className="px-3.5 text-right font-display text-[17px] font-bold">{total}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Activity feed: boxes joined by a dashed line. */
export function Timeline({ items, level = "interactive" }: { items: readonly { id: string; title: string; meta: string; tone?: Tone; icon?: ReactNode }[]; level?: Level }) {
  return (
    <ol className={cx(cardClass(level), "flex flex-col px-3.5 py-3")}>
      {items.map((it, i) => (
        <li key={it.id} className="flex items-start gap-3">
          <span className="flex flex-col items-center">
            <span
              aria-hidden
              className={cx(
                "flex size-8 items-center justify-center rounded-icon border-2 [&_svg]:size-4",
                it.tone ? `border-edge-on-fill text-on-fill ${FILL[it.tone]}` : "border-edge-card bg-surface",
              )}
            >
              {it.icon}
            </span>
            {i < items.length - 1 && <span aria-hidden className="h-[18px] border-l-2 border-dashed border-edge-card" />}
          </span>
          <span className="flex flex-col pt-0.5">
            <span className="text-[13px] font-bold">{it.title}</span>
            <span className={META}>{it.meta}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
