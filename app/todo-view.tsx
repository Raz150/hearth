"use client";

import { Button, Checkbox, Input } from "@heroui/react";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { addDays, doneLastWeek, klDate, nextSaturday, planLabel } from "@/lib/plan-dates";
import { createClient } from "@/lib/supabase/client";

type Item = {
  id: string;
  list_id: string;
  text: string;
  note: string | null;
  checked: boolean;
  added_by: string;
  created_at: string;
  planned_for: string | null;
  assigned_to: string | null;
  completed_by: string | null;
  completed_at: string | null;
};
type ItemChanges = Partial<Pick<Item, "text" | "note" | "checked" | "planned_for" | "assigned_to">>;

const groupClass = "overflow-hidden rounded-3xl bg-surface shadow-surface";
const fieldClass = "h-12 w-full px-3 text-lg";
const chipClass = (active: boolean) =>
  `h-11 rounded-full px-4 font-semibold ${active ? "bg-accent text-accent-foreground" : "bg-default text-foreground"}`;
const dateFormat = new Intl.DateTimeFormat("en-MY", {
  timeZone: "Asia/Kuala_Lumpur",
  dateStyle: "medium",
  timeStyle: "short",
});
const doneDayFormat = new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", weekday: "long" });
const blankDraft = { text: "", note: "", planned_for: "", assigned_to: "" };

function byPlanThenOldest(a: Item, b: Item) {
  return (
    (a.planned_for ?? "").localeCompare(b.planned_for ?? "") ||
    a.created_at.localeCompare(b.created_at) ||
    a.id.localeCompare(b.id)
  );
}

export function TodoView() {
  const [items, setItems] = useState<Item[]>([]);
  const [members, setMembers] = useState<Record<string, string>>({});
  // undefined until loaded; null means the hidden list doesn't exist yet.
  const [listId, setListId] = useState<string | null>();
  const [error, setError] = useState("");
  // Empty until the first load: the clock can't be read while prerendering.
  const [today, setToday] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [draft, setDraft] = useState(blankDraft);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const textInput = useRef<HTMLInputElement>(null);

  async function reload() {
    const supabase = createClient();
    const [list, listItems, people] = await Promise.all([
      supabase.from("lists").select("id").order("created_at").limit(1).maybeSingle(),
      supabase.from("list_items").select("*"),
      supabase.from("household_members").select("user_id, display_name"),
    ]);
    if (list.error || listItems.error || people.error) return setError("Couldn't load your to-do list.");
    setToday(klDate(new Date()));
    setListId(list.data?.id ?? null);
    setItems(listItems.data);
    setMembers(Object.fromEntries(people.data.map((person) => [person.user_id, person.display_name])));
    setError("");
  }

  useEffect(() => {
    const supabase = createClient();
    // iOS drops the socket in the background, so catch up whenever the app returns.
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };

    reload();
    document.addEventListener("visibilitychange", onVisible);
    const channel = supabase
      .channel(`todos-${Math.random()}`)
      // Realtime payloads can be partial rows, so treat an event only as a signal to refetch.
      .on("postgres_changes", { event: "*", schema: "public", table: "list_items" }, () => reload())
      .subscribe((status) => {
        if (status === "SUBSCRIBED") reload();
      });

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, []);

  function openNew() {
    setEditing(null);
    setDraft(blankDraft);
    setError("");
    dialog.current?.showModal();
    // iOS only opens the keyboard from focus() inside a real click.
    textInput.current?.focus();
  }

  function openEdit(item: Item) {
    setEditing(item);
    setDraft({
      text: item.text,
      note: item.note ?? "",
      planned_for: item.planned_for ?? "",
      assigned_to: item.assigned_to ?? "",
    });
    setError("");
    dialog.current?.showModal();
    // Focus the dialog, not its first field, so the keyboard stays down until they want to type.
    dialog.current?.focus();
  }

  async function addItem(fields: Omit<ItemChanges, "checked">) {
    const supabase = createClient();
    let targetList = listId;
    // shortcut: both phones adding the very first item at once makes two hidden lists; harmless, every item is shown.
    if (!targetList) {
      const created = await supabase.from("lists").insert({ name: "To-do" }).select("id").single();
      if (created.error) return setError(`Couldn't add that to-do: ${created.error.message}`);
      targetList = created.data.id;
      setListId(targetList);
    }
    const { data, error } = await supabase
      .from("list_items")
      .insert({ list_id: targetList, ...fields })
      .select()
      .single();
    if (error) return setError(`Couldn't add that to-do: ${error.message}`);
    setItems((current) => [...current.filter((item) => item.id !== data.id), data]);
    dialog.current?.close();
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const trimmed = draft.text.trim();
    if (!trimmed || busy || listId === undefined) return;
    const fields = {
      text: trimmed,
      note: draft.note.trim() || null,
      planned_for: draft.planned_for || null,
      assigned_to: draft.assigned_to || null,
    };
    if (editing) {
      dialog.current?.close();
      return updateItem(editing, fields);
    }
    setBusy(true);
    await addItem(fields);
    setBusy(false);
  }

  async function updateItem(item: Item, changes: ItemChanges) {
    setItems((current) => current.map((other) => (other.id === item.id ? { ...other, ...changes } : other)));
    const { error } = await createClient().from("list_items").update(changes).eq("id", item.id);
    if (error) {
      setError("Couldn't save that change.");
      reload();
    }
  }

  async function deleteItem(item: Item) {
    dialog.current?.close();
    setItems((current) => current.filter((other) => other.id !== item.id));
    const { error } = await createClient().from("list_items").delete().eq("id", item.id);
    if (error) {
      setError("Couldn't delete that to-do.");
      reload();
    }
  }

  async function clearChecked() {
    setItems((current) => current.filter((item) => !item.checked));
    const { error } = await createClient().from("list_items").delete().eq("checked", true);
    if (error) {
      setError("Couldn't clear checked items.");
      reload();
    }
  }

  // A realtime event can arrive before the first load sets today.
  const visible = today ? items : [];
  const sorted = [...visible].sort(byPlanThenOldest);
  const toDo = sorted.filter((item) => !item.checked);
  const done = sorted.filter((item) => item.checked);
  // Missed items roll forward into Today.
  const todayItems = toDo.filter((item) => item.planned_for && item.planned_for <= today);
  const upcoming = toDo.filter((item) => item.planned_for && item.planned_for > today);
  const anytime = toDo.filter((item) => !item.planned_for);
  const credit = Object.entries(doneLastWeek(visible, today))
    .map(([userId, count]) => `${members[userId] ?? "Someone"} ${count}`)
    .join(" · ");
  const tomorrow = today && addDays(today, 1);
  const saturday = today && nextSaturday(today);
  const days = [
    { label: "Today", day: today },
    { label: "Tomorrow", day: tomorrow },
    // On a Friday, Saturday is already "Tomorrow".
    ...(saturday === tomorrow ? [] : [{ label: "Saturday", day: saturday }]),
  ];

  const rows = (list: Item[]) => (
    <ul className={groupClass}>
      {list.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          members={members}
          today={today}
          onOpen={() => openEdit(item)}
          onToggle={(checked) => updateItem(item, { checked })}
        />
      ))}
    </ul>
  );
  const section = (title: string, list: Item[]) =>
    list.length > 0 && (
      <section className="mb-5">
        <h2 className="px-1 pb-1 font-semibold text-muted">{title}</h2>
        {rows(list)}
      </section>
    );

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="plate">
        <div className="px-5 pb-4 pt-2">
          <h1 className="text-3xl font-semibold tracking-tight">To-do</h1>
          {items.length > 0 && (
            <>
              <p className="text-muted">{toDo.length === 0 ? "All done" : `${done.length} of ${items.length} done`}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-default">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-300"
                  style={{ width: `${(done.length / items.length) * 100}%` }}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-3">
          {listId !== undefined && items.length === 0 && (
            <p className="px-1 py-4 text-lg text-muted">Nothing to do yet. Tap Add a to-do to start.</p>
          )}
          {section("Today", todayItems)}
          {section("Upcoming", upcoming)}
          {section("Anytime", anytime)}
          {done.length > 0 && (
            <section className="mb-5">
              <div className="flex items-center justify-between px-1 pb-1">
                <h2 className="font-semibold text-muted">Done</h2>
                <button className="h-11 pl-3 font-semibold text-danger" onClick={clearChecked}>
                  Clear checked items
                </button>
              </div>
              {rows(done)}
            </section>
          )}
          {credit && <p className="mb-5 px-1 text-sm text-muted">Done in the last 7 days: {credit}</p>}
        </div>

        {error && (
          <p role="alert" className="px-5 py-2 text-danger">
            {error}
          </p>
        )}
      </div>

      <div className="px-5 py-3">
        {/* A native button: iOS only opens the keyboard from focus() inside a real click. */}
        <button
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-lg font-semibold text-accent-foreground transition-transform active:scale-[0.98]"
          onClick={openNew}
        >
          <Plus aria-hidden="true" className="size-5" strokeWidth={2.5} />
          Add a to-do
        </button>
      </div>

      <dialog
        ref={dialog}
        tabIndex={-1}
        aria-label={editing ? "Edit to-do" : "New to-do"}
        className="m-auto max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem)] w-[calc(100%-2rem)] max-w-none overflow-y-auto rounded-3xl bg-surface text-foreground outline-none backdrop:bg-black/40"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close();
        }}
      >
        <form onSubmit={save} className="flex flex-col gap-3 p-5">
          <h2 className="text-xl font-semibold">{editing ? "Edit to-do" : "New to-do"}</h2>
          <Input
            ref={textInput}
            variant="secondary"
            className={fieldClass}
            value={draft.text}
            onChange={(event) => setDraft({ ...draft, text: event.target.value })}
            placeholder="What needs doing?"
            aria-label="To-do"
            maxLength={500}
            enterKeyHint="done"
            autoCapitalize="sentences"
          />
          <Input
            variant="secondary"
            className={fieldClass}
            value={draft.note}
            onChange={(event) => setDraft({ ...draft, note: event.target.value })}
            placeholder="Note (optional)"
            aria-label="Note"
            maxLength={500}
            enterKeyHint="done"
          />

          <div role="group" aria-labelledby="when-label" className="flex flex-col gap-2">
            <span id="when-label" className="font-semibold text-muted">When</span>
            <div className="flex flex-wrap gap-2">
              {days.map(({ label, day }) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={draft.planned_for === day}
                  className={chipClass(draft.planned_for === day)}
                  onClick={() => setDraft({ ...draft, planned_for: draft.planned_for === day ? "" : day })}
                >
                  {label}
                </button>
              ))}
            </div>
            <Input
              type="date"
              variant="secondary"
              className={fieldClass}
              value={draft.planned_for}
              onChange={(event) => setDraft({ ...draft, planned_for: event.target.value })}
              aria-label="Pick a date"
            />
          </div>

          <div role="group" aria-labelledby="whose-label" className="flex flex-col gap-2">
            <span id="whose-label" className="font-semibold text-muted">Whose</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={!draft.assigned_to}
                className={chipClass(!draft.assigned_to)}
                onClick={() => setDraft({ ...draft, assigned_to: "" })}
              >
                Either
              </button>
              {Object.entries(members).map(([userId, name]) => (
                <button
                  key={userId}
                  type="button"
                  aria-pressed={draft.assigned_to === userId}
                  className={chipClass(draft.assigned_to === userId)}
                  onClick={() => setDraft({ ...draft, assigned_to: userId })}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {editing && (
            <p className="text-sm text-muted">
              Added by {members[editing.added_by] ?? "…"}, {dateFormat.format(new Date(editing.created_at))}
            </p>
          )}
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}

          <div className="mt-1 flex gap-2">
            <Button variant="tertiary" className="h-12 flex-1 text-base" onPress={() => dialog.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" className="h-12 flex-1 text-base" isDisabled={busy}>
              {editing ? "Save" : busy ? "Adding…" : "Add to-do"}
            </Button>
          </div>
          {editing && (
            <Button variant="danger-soft" className="h-12 w-full text-base" onPress={() => deleteItem(editing)}>
              Delete to-do
            </Button>
          )}
        </form>
      </dialog>
    </main>
  );
}

function ItemRow({
  item,
  members,
  today,
  onOpen,
  onToggle,
}: {
  item: Item;
  members: Record<string, string>;
  today: string;
  onOpen: () => void;
  onToggle: (checked: boolean) => void;
}) {
  const owner = item.assigned_to && members[item.assigned_to];
  const doneBy =
    item.checked && item.completed_by && item.completed_at
      ? `Done by ${members[item.completed_by] ?? "…"}, ${doneDayFormat.format(new Date(item.completed_at))}`
      : null;
  const plan = !item.checked && item.planned_for ? planLabel(item.planned_for, today) : null;
  const meta = doneBy ?? (plan === "Today" ? null : plan);

  return (
    <li className="flex items-center border-b border-separator last:border-b-0">
      <Checkbox
        variant="secondary"
        className="flex size-14 shrink-0 items-center justify-center"
        isSelected={item.checked}
        onChange={onToggle}
        aria-label={`Mark ${item.text} as done`}
      >
        <Checkbox.Content>
          <Checkbox.Control className="size-6 rounded-full">
            <Checkbox.Indicator />
          </Checkbox.Control>
        </Checkbox.Content>
      </Checkbox>
      <button
        className={`min-h-14 flex-1 py-2 pr-4 text-left [overflow-wrap:anywhere] ${item.checked ? "text-muted line-through" : ""}`}
        onClick={onOpen}
      >
        <span className="block text-lg">{item.text}</span>
        {item.note && <span className="block text-sm text-muted">{item.note}</span>}
        {meta && <span className="block text-sm text-muted">{meta}</span>}
      </button>
      {owner && (
        <span
          role="img"
          aria-label={`For ${owner}`}
          className="mr-4 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold"
        >
          {owner[0].toUpperCase()}
        </span>
      )}
    </li>
  );
}
