import { ImageResponse } from "next/og";
import { IconArt } from "@/lib/icon-art";

// Manifest icons, generated once at build time.
const ICONS: Record<string, { size: number; pad: number }> = {
  "192.png": { size: 192, pad: 0.12 },
  "512.png": { size: 512, pad: 0.12 },
  "maskable-512.png": { size: 512, pad: 0.22 }, // Android crops maskable icons to a circle/squircle
};

export const dynamic = "force-static";
export const dynamicParams = false;
export const generateStaticParams = () => Object.keys(ICONS).map((name) => ({ name }));

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const icon = ICONS[(await params).name];
  if (!icon) return new Response("Not found", { status: 404 });
  return new ImageResponse(<IconArt size={icon.size} pad={icon.pad} />, { width: icon.size, height: icon.size });
}
