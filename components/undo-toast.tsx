"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useStore } from "@/lib/mock";

export function UndoToast() {
  const { undo, revert, dismissUndo } = useStore();

  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(dismissUndo, 5000);
    return () => clearTimeout(t);
  }, [undo, dismissUndo]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-30 flex justify-center px-4">
      <AnimatePresence>
        {undo && (
          <motion.div
            key={undo.id}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="pointer-events-auto flex max-w-md items-center gap-2 rounded-full bg-ink py-1 pl-5 pr-1 text-paper shadow-lg"
          >
            <span className="truncate font-hand text-sm">{undo.label}</span>
            <button onClick={revert} className="min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold text-highlight">
              Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
