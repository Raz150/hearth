import { ImageResponse } from "next/og";
import { IconArt } from "@/lib/icon-art";

// Home Screen icon on iPhone. iOS rounds the corners itself, so the art is full-bleed and opaque.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<IconArt size={180} pad={0.12} />, size);
}
