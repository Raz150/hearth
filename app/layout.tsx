import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  title: "Hearth",
  description: "Our shared household lists",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6fb" },
    { media: "(prefers-color-scheme: dark)", color: "#121218" },
  ],
};

// HeroUI only themes via data-theme, so following the iPhone setting has to be done here.
const themeScript = `try{var r=document.documentElement,m=matchMedia("(prefers-color-scheme: dark)"),s=function(){return localStorage.getItem("theme")},a=function(){r.dataset.theme=s()||(m.matches?"dark":"light")};a();m.addEventListener("change",a);if(s())addEventListener("DOMContentLoaded",function(){document.querySelectorAll('meta[name="theme-color"]').forEach(function(e){e.content=s()==="dark"?"#121218":"#f6f6fb"})})}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The script below adds data-theme before React hydrates.
    <html lang="en" className={`h-full antialiased ${jakarta.variable}`} suppressHydrationWarning>
      <head>
        {/* Inline so the theme applies before first paint, with no flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
