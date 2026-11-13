export const INKS = [
  { name: "Rose", hex: "#e0849f" },
  { name: "Cornflower", hex: "#6f94c8" },
  { name: "Sage", hex: "#7fa36b" },
  { name: "Terracotta", hex: "#d08b5b" },
  { name: "Lavender", hex: "#9c88c9" },
  { name: "Teal", hex: "#5fa3a0" },
  { name: "Mustard", hex: "#c9a43f" },
  { name: "Plum", hex: "#b26a93" },
];

/** Readable text shade of an ink: blended toward the page ink, so it darkens on paper and lightens at night (≥4.5:1 both). */
export const inkText = (hex: string) => `color-mix(in oklab, ${hex} 45%, var(--ink))`;
