"use client";

import { useState, type ReactNode } from "react";
import { CalendarDays, ClipboardList, Ellipsis, Heart, House, Pencil, Plus, ShoppingCart, Sparkle, Trash2, Wallet } from "lucide-react";
import { Avatar, AvatarPair, Byline } from "@/components/kit/avatar";
import { Button, Fab, IconButton, linkClass } from "@/components/kit/button";
import { EmptyState, EventCard, HighlightCard, NoteWindow, StatTile } from "@/components/kit/card";
import { ConfirmDialog, DialogWindow, MessageBubble, Toast } from "@/components/kit/feedback";
import { Field, NoteTextarea, SearchField, Select } from "@/components/kit/field";
import { ExpenseTable, ListCard, ListRow, Timeline } from "@/components/kit/list";
import { DayPicker, TabBar, TopBar, WeekStrip } from "@/components/kit/nav";
import { LoadingBar, ProgressBar, StepTracker, Stepper } from "@/components/kit/progress";
import { Checkbox, Chip, CountBadge, NewTag, RadioGroup, RemovableChip, Segmented, StatusPill, Toggle } from "@/components/kit/selection";
import { addDays, klToday } from "@/lib/date";

// Every Outline Pop component, laid out like docs/design/reference/components-light.html (and -dark).

function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="border-b-2 border-edge-card pb-2 font-display text-[13px] font-bold uppercase tracking-[2px]">
        {n} · {title}
      </h2>
      {children}
    </section>
  );
}
/** Caption under a group, like the reference's `.k` labels. */
const K = ({ children }: { children: ReactNode }) => <span className="text-[11px] font-semibold text-muted">{children}</span>;

const SWATCHES = ["bg-shopping", "bg-chores", "bg-money", "bg-hero", "bg-surface-sunken", "bg-done", "bg-danger"];

export default function KitPage() {
  const today = klToday();
  const [range, setRange] = useState<"today" | "week" | "month">("today");
  const [filter, setFilter] = useState("All");
  const [payer, setPayer] = useState<"h" | "w" | "split">("h");
  const [qty, setQty] = useState(2);
  const [hearted, setHearted] = useState(false);
  const [day, setDay] = useState(today);
  const [dialog, setDialog] = useState(false);
  const [tags, setTags] = useState(["Eggs"]);

  return (
    <main className="mx-auto flex max-w-[1440px] flex-col gap-11 px-5 pb-16 pt-[calc(env(safe-area-inset-top)+3rem)] xl:px-[60px] xl:pt-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[2px] text-muted">Family home app · UI kit</span>
          <span className="font-display text-[32px] font-bold leading-none tracking-[-1.5px] md:text-[44px]">E · Outline Pop — Components</span>
        </div>
        <div aria-hidden className="flex items-center gap-2">
          {SWATCHES.map((c) => (
            <span key={c} className={`size-7 rounded-[8px] border-2 border-edge-on-fill ${c}`} />
          ))}
        </div>
      </header>

      <div className="grid items-start gap-10 md:grid-cols-2 xl:grid-cols-4">
        {/* COLUMN 1 */}
        <div className="flex flex-col gap-10">
          <Section n="01" title="Buttons">
            <div className="flex flex-wrap gap-3">
              <Button>Save</Button>
              <Button variant="secondary">Cancel</Button>
            </div>
            <K>primary (ink) · secondary (white) · 48 h · hard 3px</K>
            <div className="flex flex-wrap gap-3">
              <Button variant="shopping">
                <Plus aria-hidden className="size-[18px]" strokeWidth={2.6} />
                Add item
              </Button>
              <Button variant="danger">Delete</Button>
            </div>
            <K>accent with icon · destructive (coral)</K>
            <div className="flex flex-wrap items-center gap-3">
              {/* The pressed look, frozen: shadow gone, moved 3px. */}
              <Button tabIndex={-1} aria-hidden style={{ transform: "translate(3px, 3px)", boxShadow: "none" }}>
                Pressed
              </Button>
              <Button disabled>Disabled</Button>
            </div>
            <K>pressed: shadow 0, moves 3px · disabled: no shadow</K>
            <Button size="block" variant="money">
              Add to shopping list
            </Button>
            <K>block button · stacked shadow (1 per screen)</K>
            <div className="flex items-center gap-3">
              <IconButton label="Edit">
                <Pencil aria-hidden strokeWidth={2.2} />
              </IconButton>
              <IconButton label="Delete">
                <Trash2 aria-hidden strokeWidth={2.2} />
              </IconButton>
              <IconButton label="More">
                <Ellipsis aria-hidden strokeWidth={2.2} />
              </IconButton>
              <Fab label="Add">
                <Plus aria-hidden strokeWidth={2.6} />
              </Fab>
              <a href="#" className={linkClass}>
                See all →
              </a>
            </div>
            <K>icon 44 · FAB 56 · text link</K>
          </Section>

          <Section n="02" title="Inputs">
            <Field label="List name" defaultValue="Weekly groceries" />
            <Field label="Focused" placeholder="Type an item…" style={{ boxShadow: "3px 3px 0 var(--chores), 3px 3px 0 2px var(--shadow)" }} />
            <Field label="Error" placeholder="Amount (RM)" inputMode="decimal" error="Enter an amount first" />
            <SearchField label="Search items" onScan={() => {}} />
            <K>search with scan action</K>
            <Select label="List" defaultValue="groceries">
              <option value="groceries">Groceries</option>
              <option value="household">Household</option>
            </Select>
            <NoteTextarea label="Note" placeholder="Write a note for W…" />
            <K>select · note textarea (typewriter)</K>
          </Section>
        </div>

        {/* COLUMN 2 */}
        <div className="flex flex-col gap-10">
          <Section n="03" title="Selection">
            <div className="flex flex-wrap gap-x-[18px]">
              <Checkbox label="To do" />
              <Checkbox label="Done" defaultChecked />
              <Checkbox label="Square" square defaultChecked />
            </div>
            <K>checkbox (lists) · square (settings)</K>
            <RadioGroup
              legend="Paid by"
              value={payer}
              onChange={setPayer}
              options={[
                { value: "h", label: "H" },
                { value: "w", label: "W" },
                { value: "split", label: "Split" },
              ]}
            />
            <div>
              <Toggle label="Remind me at 7 PM" defaultChecked />
              <Toggle label="Share with W" />
            </div>
            <Segmented
              label="Range"
              value={range}
              onChange={setRange}
              options={[
                { value: "today", label: "Today" },
                { value: "week", label: "Week" },
                { value: "month", label: "Month" },
              ]}
            />
            <K>segmented control</K>
            <div className="flex flex-wrap gap-2">
              {["All", "Groceries 6", "Household"].map((c) => (
                <Chip key={c} selected={filter === c} onClick={() => setFilter(c)}>
                  {c}
                </Chip>
              ))}
              {tags.map((t) => (
                <RemovableChip key={t} removeLabel={`Remove ${t.toLowerCase()}`} onRemove={() => setTags((x) => x.filter((y) => y !== t))}>
                  {t}
                </RemovableChip>
              ))}
            </div>
            <K>filter chips · removable chip</K>
            <div className="flex flex-wrap items-center gap-2.5">
              <CountBadge count={3} label="3 to buy" />
              <NewTag />
              <StatusPill tone="chores">Done</StatusPill>
              <StatusPill tone="hero">Due today</StatusPill>
            </div>
            <K>count · new · status badges</K>
          </Section>

          <Section n="04" title="Progress">
            <div className="flex items-center gap-3.5">
              <Stepper label="quantity" value={qty} onChange={setQty} min={1} />
              <K>quantity stepper</K>
            </div>
            <ProgressBar label="November budget" value={62} />
            <StepTracker steps={["Listed", "Bought", "Paid", "Stored"]} done={2} />
            <LoadingBar label="Syncing…" value={70} />
            <K>budget bar · step tracker · loading</K>
          </Section>

          <Section n="05" title="Avatars">
            <div className="flex flex-wrap items-center gap-3.5">
              <Avatar person="h" initial="H" size={48} online />
              <Avatar person="w" initial="W" />
              <AvatarPair />
              <Byline person="w" initial="W">
                added by W
              </Byline>
            </div>
            <K>48 with status · 38 · 30 group · byline tag</K>
          </Section>
        </div>

        {/* COLUMN 3 */}
        <div className="flex flex-col gap-10">
          <Section n="06" title="Cards">
            <div className="grid grid-cols-2 gap-3">
              <StatTile tone="shopping" icon={<ShoppingCart strokeWidth={2} />} value="6" label="to buy" href="#" />
              <StatTile tone="chores" icon={<House strokeWidth={2} />} value="2/5" label="chores" href="#" />
            </div>
            <K>stat tile · one flat colour each</K>
            <NoteWindow
              title="From W"
              text="Don't forget the eggs, sayang!"
              meta="Sent 7:12, seen 7:20"
              hearted={hearted}
              heartLabel="Send a heart back to W"
              onHeart={() => setHearted(true)}
              action="Reply"
              onAction={() => {}}
            />
            <K>note window · stacked shadow</K>
            <EventCard title="Dinner at Mak's" meta="Today · both of you" time="7:30" period="PM" href="#" />
            <K>event card</K>
            <HighlightCard tone="shopping" icon={<Heart strokeWidth={2.4} />} title="Date night" meta="Fri, 20 Nov · 8:00 PM" />
            <K>highlight card</K>
            <EmptyState icon={<Sparkle className="fill-money" strokeWidth={1.6} />} title="No chores left today" action="Add a chore" onAction={() => {}} />
            <K>empty state · dashed</K>
          </Section>
        </div>

        {/* COLUMN 4 */}
        <div className="flex flex-col gap-10">
          <Section n="07" title="Lists">
            <ListCard title="Shopping list" more={{ href: "#", label: "See all 6" }}>
              <ListRow title="Rice 5kg" meta="added by W" checkLabel="Got rice" iconTone="money" />
              <ListRow title="Eggs" meta="bought by H" checkLabel="Got eggs" iconTone="chores" defaultChecked />
            </ListCard>
            <K>list card · row 54 · checked row</K>
            <ExpenseTable
              caption="November spending"
              rows={[
                { label: "Groceries", amount: "RM 86.40" },
                { label: "Electricity", amount: "RM 186.00" },
              ]}
              total="RM 272.40"
            />
            <K>expense table · total row</K>
            <Timeline
              items={[
                { id: "1", title: "W added Rice 5kg", meta: "7:10 AM", tone: "chores" },
                { id: "2", title: "H finished Trash out", meta: "6:55 AM" },
                { id: "3", title: "W paid Electricity", meta: "Yesterday" },
              ]}
            />
            <K>activity timeline</K>
          </Section>

          <Section n="08" title="Feedback">
            <DialogWindow title="Delete list?" onClose={() => {}} onConfirm={() => setDialog(true)}>
              This removes 6 items for both of you.
            </DialogWindow>
            <K>dialog · retro window (tap “Yes, delete” to open it as a real modal)</K>
            <Toast message="Saved to Shopping" onUndo={() => {}} />
            <K>toast</K>
            <MessageBubble person="w" initial="W" text="On my way home!" time="7:45 PM" />
            <K>message bubble</K>
          </Section>
        </div>
      </div>

      <Section n="09" title="Navigation">
        <div className="flex flex-wrap items-center gap-10">
          <div className="w-[340px] max-w-full">
            <TopBar
              title="Shopping"
              back="/"
              action={
                <IconButton label="More options">
                  <Ellipsis aria-hidden strokeWidth={2.2} />
                </IconButton>
              }
            />
          </div>
          <div className="w-[354px] max-w-full">
            <TabBar
              floating={false}
              tabs={[
                { href: "/kit", label: "Home", icon: <House strokeWidth={2.2} /> },
                { href: "/todo", label: "Lists", icon: <ClipboardList strokeWidth={2.2} /> },
                { href: "/doa", label: "Write a note", icon: <Pencil strokeWidth={2.2} /> },
                { href: "/chores", label: "Calendar", icon: <CalendarDays strokeWidth={2.2} /> },
                { href: "/bills", label: "Money", icon: <Wallet strokeWidth={2.2} /> },
              ]}
            />
          </div>
          <div className="w-[340px] max-w-full">
            <DayPicker days={[-2, -1, 0, 1, 2].map((n) => addDays(today, n))} today={today} value={day} onChange={setDay} />
          </div>
        </div>
        <K>top bar (back · title · more) · tab bar with active chip · day picker</K>
        <div className="w-[354px] max-w-full">
          <WeekStrip days={[-3, -2, -1, 0, 1, 2, 3].map((n) => addDays(today, n))} today={today} dots={{ [today]: "money", [addDays(today, 2)]: "shopping" }} />
        </div>
        <K>week strip (home): today in ink, 5px event dots</K>
      </Section>

      <ConfirmDialog open={dialog} title="Delete list?" onClose={() => setDialog(false)} onConfirm={() => setDialog(false)}>
        This removes 6 items for both of you.
      </ConfirmDialog>
    </main>
  );
}
