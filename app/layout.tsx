import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import AppShell from "@/components/AppShell";

// Self-hosted (SIL Open Font License) so builds never depend on fetching Google Fonts.
const display = localFont({ src: "./fonts/Fraunces-Variable-latin.woff2", variable: "--font-display-face", weight: "100 900", display: "swap" });
const body = localFont({ src: "./fonts/DMSans-Variable-latin.woff2", variable: "--font-body", weight: "100 1000", display: "swap" });
// Hebrew faces: the Latin fonts have no Hebrew glyphs, so these sit next in the font stack (globals.css).
const displayHe = localFont({ src: "./fonts/FrankRuhlLibre-Variable-hebrew.woff2", variable: "--font-display-he", weight: "300 900", display: "swap" });
const bodyHe = localFont({ src: "./fonts/Heebo-Variable-hebrew.woff2", variable: "--font-body-he", weight: "100 900", display: "swap" });

// Set lang/dir from the saved preference before first paint, so Hebrew users never see an LTR flash.
const LANG_BOOT = `try{var s=JSON.parse(localStorage.getItem("sewcraft:v1")||"null");if(s&&s.profile&&s.profile.lang==="he"){var d=document.documentElement;d.lang="he";d.dir="rtl"}}catch(e){}`;

export const metadata: Metadata = {
  title: { default: "SewCraft — Your next creation starts here", template: "%s · SewCraft" },
  description: "Discover, prepare, measure, cut and sew — guided sewing projects with accurate patterns.",
  manifest: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/manifest.webmanifest`,
};

export const viewport: Viewport = { themeColor: "#faf6ef", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LANG_BOOT }} />
      </head>
      <body className={`${display.variable} ${body.variable} ${displayHe.variable} ${bodyHe.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
