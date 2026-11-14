import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Bricolage_Grotesque, Inter, Special_Elite } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { THEME_COLOR } from "@/lib/theme-color";
import "./globals.css";

// Variable names are read by --font-display / --font-body / --font-note in docs/design/tokens.css.
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", axes: ["opsz"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const specialElite = Special_Elite({ subsets: ["latin"], weight: "400", variable: "--font-special-elite" });

/** Theme picked in Settings ("light" | "dark"), or undefined to follow the phone. */
async function savedTheme() {
  const t = (await cookies()).get("theme")?.value;
  return t === "light" || t === "dark" ? t : undefined;
}

export const metadata: Metadata = {
  title: "Hearth",
  description: "Our little household journal.",
  appleWebApp: { capable: true, title: "Hearth", statusBarStyle: "default" },
  // Next only emits the generic tag; older iOS versions still look for the apple- one.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export async function generateViewport(): Promise<Viewport> {
  const theme = await savedTheme();
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: theme
      ? THEME_COLOR[theme]
      : [
          { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light },
          { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark },
        ],
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme={await savedTheme()} className={`${bricolage.variable} ${inter.variable} ${specialElite.variable}`}>
      <body className="antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
