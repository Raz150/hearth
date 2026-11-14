"use client";

import { useRef, useState, type ReactNode } from "react";
import { AnimatePresence, animate, motion, useMotionValue } from "motion/react";
import { Pencil, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/card";
import { ListCard } from "@/components/kit/list";
import { ProgressBar } from "@/components/kit/progress";
import { Chip, CountBadge, Tick } from "@/components/kit/selection";
import { HIT_44, cx } from "@/components/kit/shared";
import { Sheet } from "@/components/sheet";
import { Confetti, Face, Page, PageHeader, Section } from "@/components/ui";
import { AISLES } from "@/lib/shopping";
import { useStore, type Item } from "@/lib/store";

const label = (i: Item) => (i.qty ? `${i.name} (${i.qty})` : i.name);
// Staples first: what we buy most often, then most recently.
const byHabit = (a: Item, b: Item) => b.times - a.times || (b.gotAt ?? "").localeCompare(a.gotAt ?? "");

/** Swipe left to remove: red shows underneath, past ~100px (or a flick) it slides off and calls `onRemove`. */
function SwipeToRemove({ onRemove, className, children }: { onRemove: () => void; className: string; children: ReactNode }) {
  const x = useMotionValue(0);
  const box = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  return (
    <div className="relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 flex items-center justify-end gap-1.5 bg-danger pr-5 text-sm font-bold text-on-fill">
        <Trash2 className="size-4" strokeWidth={2.4} /> Remove
      </div>
      <motion.div
        ref={box}
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.9, right: 0 }}
        onPointerDown={() => (dragged.current = false)}
        onDragStart={() => (dragged.current = true)}
        // a swipe that ends over the row isn't a tap: don't tick it
        onClickCapture={(e) => {
          if (!dragged.current) return;
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragEnd={(_, i) => {
          if (i.offset.x < -100 || i.velocity.x < -600) animate(x, -(box.current?.offsetWidth ?? 400), { duration: 0.16 }).then(onRemove);
        }}
        className={cx("relative touch-pan-y", className)}
      >
        {children}
      </motion.div>
    </div>
  );
}

function ItemSheet({ item: i, onClose }: { item: Item; onClose: () => void }) {
  const s = useStore();
  const edit = (patch: Partial<Item>) => s.editItem(i.id, { name: i.name, qty: i.qty, aisle: i.aisle, ...patch });
  const blurOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && e.currentTarget.blur();
  const input = "h-12 rounded-control border-2 border-edge-control bg-surface px-3.5 text-fg focus:shadow-focus";
  return (
    <Sheet label={i.name} onClose={onClose}>
      <div className="flex gap-2">
        <input
          defaultValue={i.name}
          maxLength={60}
          aria-label="Item"
          onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== i.name && edit({ name: e.target.value })}
          onKeyDown={blurOnEnter}
          className={cx(input, "min-w-0 flex-1 font-display text-xl font-bold")}
        />
        <input
          defaultValue={i.qty}
          maxLength={20}
          placeholder="Qty"
          aria-label="Quantity"
          onBlur={(e) => e.target.value.trim() !== (i.qty ?? "") && edit({ qty: e.target.value })}
          onKeyDown={blurOnEnter}
          className={cx(input, "w-24 text-base font-semibold placeholder:text-subtle")}
        />
      </div>
      <p className="mt-2 text-xs font-semibold text-muted">
        {i.times ? `Bought ${i.times} ${i.times === 1 ? "time" : "times"}` : "Not bought yet"}
        {i.addedBy && `, added by ${s.member(i.addedBy)?.name ?? "someone"}`}
      </p>

      <div className="mt-5 flex flex-wrap gap-2 border-t-[1.5px] border-dashed border-divider pt-4" role="group" aria-label="Aisle">
        {AISLES.map((a) => (
          <Chip key={a.id} selected={i.aisle === a.id} fill="bg-shopping" onClick={() => edit({ aisle: a.id })}>
            {a.label}
          </Chip>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            onClose();
            s.removeItem(i.id);
          }}
        >
          <Trash2 aria-hidden className="size-4" strokeWidth={2.2} /> Remove
        </Button>
        <Button size="sm" onClick={onClose}>
          Done
        </Button>
      </div>
    </Sheet>
  );
}

export default function ShoppingPage() {
  const s = useStore();
  const [text, setText] = useState("");
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const sheetItem = s.shopping.find((i) => i.id === sheetId && i.onList); // closes by itself if removed on the other phone

  const list = s.shopping.filter((i) => i.onList);
  const toBuy = list.filter((i) => !i.gotBy);
  const trolley = list.filter((i) => i.gotBy);
  const history = s.shopping.filter((i) => !i.onList).sort(byHabit);
  const q = text.trim().toLowerCase();
  // While typing: things we've had before that match. Otherwise: our staples, one tap to put back.
  const suggest = q ? history.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 6) : history.filter((i) => i.times > 0).slice(0, 12);
  const aisles = AISLES.map((a) => [a, toBuy.filter((i) => i.aisle === a.id).sort((x, y) => x.name.localeCompare(y.name))] as const).filter(([, items]) => items.length);

  function add(e: React.FormEvent) {
    e.preventDefault();
    s.addItem(text);
    setText("");
  }

  // In the shop speed wins: tap anywhere on the row to tick it, swipe left to remove. Editing is the small pencil.
  const row = (i: Item) => {
    const got = !!i.gotBy;
    const id = `item-${i.id}`;
    return (
      <motion.li
        key={i.id}
        layout="position"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.22 }}
      >
        <SwipeToRemove onRemove={() => s.removeItem(i.id)} className="flex min-h-[54px] items-center gap-1 bg-surface pl-3.5 pr-1.5">
        <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 self-stretch">
          <span className={cx("truncate text-base font-bold transition-colors", got && "text-subtle line-through")}>{i.name}</span>
          {i.qty && <span className={cx("shrink-0 rounded-full border-[1.5px] border-edge-control px-2 text-xs font-bold", got && "text-subtle")}>{i.qty}</span>}
          {/* Whose idea it was, when it wasn't mine; in the trolley, who picked it up. */}
          <span className="ml-auto shrink-0">{got ? <Face member={s.member(i.gotBy)} size={18} /> : i.addedBy !== s.me && <Face member={s.member(i.addedBy)} size={18} />}</span>
        </label>
        <button type="button" onClick={() => setSheetId(i.id)} aria-haspopup="dialog" aria-label={`Edit ${i.name}`} className="grid size-11 shrink-0 place-items-center text-muted">
          <Pencil aria-hidden className="size-4" strokeWidth={2.2} />
        </button>
        <Tick id={id} label={`Got ${label(i)}`} checked={got} onChange={() => s.toggleItem(i.id)} className="-ml-1" />
        </SwipeToRemove>
      </motion.li>
    );
  };

  const chips = (title: string) =>
    suggest.length > 0 && (
      <Section title={title}>
        <div className="flex flex-wrap gap-2">
          <AnimatePresence initial={false}>
            {suggest.map((i) => (
              <motion.span key={i.id} layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}>
                <Chip
                  selected={false}
                  aria-label={`Add ${label(i)}`}
                  onClick={() => {
                    s.addItem(i.name);
                    setText("");
                  }}
                >
                  <Plus aria-hidden strokeWidth={2.6} /> {i.name}
                </Chip>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </Section>
    );

  return (
    <Page>
      <PageHeader kicker="Our list" title="Shopping" />

      <form onSubmit={add} className="rounded-card border-2 border-dashed border-edge-control text-fg transition-shadow focus-within:border-solid focus-within:bg-surface focus-within:shadow-focus">
        <div className="flex h-12 items-center gap-2.5 pl-3.5 pr-1.5">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={80}
            enterKeyHint="enter"
            autoComplete="off"
            placeholder="Add susu, 2 roti, beras 5kg…"
            aria-label="New item"
            className="h-full min-w-0 flex-1 bg-transparent text-base font-medium placeholder:text-subtle focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Add item"
            disabled={!q}
            className={cx("flex size-9 shrink-0 items-center justify-center rounded-icon border-2 border-edge-control bg-primary text-primary-fg transition-opacity disabled:opacity-40", HIT_44)}
          >
            <Plus className="size-5" strokeWidth={2.6} />
          </button>
        </div>
      </form>

      {/* Matches right under the box while typing; staples wait below the list, since in the shop the list comes first. */}
      {q && chips("Had before")}

      {list.length === 0 && <EmptyState icon={<ShoppingCart strokeWidth={2} />} title="Nothing to buy. Add things as you run out, and they'll be sorted by aisle for the trip." />}

      {trolley.length > 0 && <ProgressBar label={`${trolley.length} of ${list.length} in the trolley`} value={(trolley.length / list.length) * 100} tone="done" />}

      {toBuy.length > 0 && (
        // One card, aisles as quiet subheadings: a stack of orange headers would shout, and the page should stay calm.
        <ListCard title="To buy" tint="shopping" aside={<CountBadge count={toBuy.length} tone="shopping" />}>
          {aisles.map(([a, items]) => (
            <section key={a.id} aria-label={a.label}>
              <h3 className="bg-surface-sunken px-3.5 py-1.5 text-xs font-bold text-muted">{a.label}</h3>
              <ul className="divide-y-[1.5px] divide-dashed divide-divider border-t-[1.5px] border-dashed border-divider">
                <AnimatePresence initial={false}>{items.map(row)}</AnimatePresence>
              </ul>
            </section>
          ))}
        </ListCard>
      )}
      {list.length > 0 && toBuy.length === 0 && <p className="px-0.5 text-sm font-semibold text-muted">Got everything. Tap Done shopping once you&apos;ve paid.</p>}

      {trolley.length > 0 && (
        <ListCard title="In the trolley" aside={<CountBadge count={trolley.length} tone="done" />}>
          <ul className="divide-y-[1.5px] divide-dashed divide-divider">
            <AnimatePresence initial={false}>{trolley.map(row)}</AnimatePresence>
          </ul>
          <div className="bg-surface p-3">
            <Button
              variant="shopping"
              className="w-full"
              onClick={() => {
                s.finishShopping();
                setBurst((b) => b + 1);
              }}
            >
              <ShoppingCart aria-hidden className="size-5" strokeWidth={2.2} /> Done shopping
            </Button>
          </div>
        </ListCard>
      )}

      {!q && chips("Buy again")}

      {burst > 0 && <Confetti key={burst} />}
      <AnimatePresence>{sheetItem && <ItemSheet key={sheetItem.id} item={sheetItem} onClose={() => setSheetId(null)} />}</AnimatePresence>
    </Page>
  );
}
