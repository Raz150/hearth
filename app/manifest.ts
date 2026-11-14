import type { MetadataRoute } from "next";
import { THEME_COLOR } from "@/lib/theme-color";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hearth",
    short_name: "Hearth",
    description: "Our little household journal.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: THEME_COLOR.light,
    theme_color: THEME_COLOR.light,
    icons: [
      { src: "/icons/192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
