"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, useDragControls } from "motion/react";

/** Bottom sheet: slides up, drag the handle down (or tap outside, or Esc) to close. Wrap in AnimatePresence. */
export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const drag = useDragControls();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // keep the list behind from scrolling
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  // Portal: the page wrapper is transformed, which would pin "fixed" to it instead of the screen.
  return createPortal(
    <>
      <motion.div aria-hidden initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-[#1a201b]/35" />
      <motion.div
        role="dialog"
        aria-modal
        aria-label={label}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        drag="y"
        dragListener={false}
        dragControls={drag}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={(_, i) => (i.offset.y > 90 || i.velocity.y > 500) && onClose()}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88dvh] max-w-md overflow-y-auto rounded-t-[1.75rem] border-t border-line bg-card px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-[0_-12px_40px_-16px_rgba(30,40,25,0.45)]"
      >
        <div onPointerDown={(e) => drag.start(e)} className="-mx-5 flex cursor-grab touch-none justify-center pt-2.5 pb-3">
          <span className="h-1.5 w-10 rounded-full bg-line" />
        </div>
        {children}
      </motion.div>
    </>,
    document.body,
  );
}
