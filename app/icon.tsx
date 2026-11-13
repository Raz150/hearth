import { ImageResponse } from "next/og";
import { IconArt } from "@/lib/icon-art";

// Browser tab favicon.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<IconArt size={32} pad={0.02} />, size);
}
