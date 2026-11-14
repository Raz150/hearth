"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Toast } from "@/components/kit/feedback";
import { useStore } from "@/lib/store";

/** Sits just above the tab bar (26 + 62 + a gap). */
export function UndoToast() {
  const { undo, revert, dismissUndo } = useStore();

  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(dismissUndo, 5000);
    return () => clearTimeout(t);
  }, [undo, dismissUndo]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-[18px] bottom-[calc(env(safe-area-inset-bottom)+100px)] z-[60] mx-auto max-w-md">
      <AnimatePresence>
        {undo && (
          <motion.div
            key={undo.id}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="pointer-events-auto"
          >
            <Toast message={undo.label} error={undo.error} onUndo={undo.undo ? revert : undefined} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
