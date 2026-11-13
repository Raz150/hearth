import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces, Special_Elite } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { themeScript } from "@/components/theme";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["SOFT", "opsz"] });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });
const specialElite = Special_Elite({ subsets: ["latin"], weight: "400", variable: "--font-special-elite" });

export const metadata: Metadata = {
  title: "Hearth",
  description: "Our little household journal.",
  appleWebApp: { capable: true, title: "Hearth", statusBarStyle: "default" },
  // Next only emits the generic tag; older iOS versions still look for the apple- one.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef0df" },
    { media: "(prefers-color-scheme: dark)", color: "#1a201b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fraunces.variable} ${figtree.variable} ${specialElite.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
