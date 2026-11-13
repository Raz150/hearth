// App icon artwork, rendered to PNG by next/og (ImageResponse). Plain inline styles only.
const PAPER = "#eef0df";
const INK = "#35392b";

/** A little house with a candle-amber flame inside. `pad` is the margin as a fraction of size (maskable icons need ~0.2). */
export function IconArt({ size, pad }: { size: number; pad: number }) {
  const art = Math.round(size * (1 - pad * 2));
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: PAPER }}>
      <svg width={art} height={art} viewBox="0 0 64 64">
        <path d="M17 29 L32 16 L47 29 Z" fill="#f8f8ee" />
        <path d="M17 28 V51 a3 3 0 0 0 3 3 H44 a3 3 0 0 0 3 -3 V28" fill="#f8f8ee" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M9 31 L32 11 L55 31" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M32 49 C25.5 49 23 44.5 23 41 C23 36 27.5 33.5 29 28.5 C32 31 33 33.5 32.5 36 C34.5 35 35.5 33 36 31 C39.5 34 41 37.5 41 41 C41 45.5 37.5 49 32 49 Z" fill="#e3b76b" />
        <path d="M32 49 C29 49 27.5 47 27.5 45 C27.5 42.5 30 41 31 38.5 C33 40 35 42.5 35 45 C35 47.5 33.5 49 32 49 Z" fill="#d08b5b" />
      </svg>
    </div>
  );
}
