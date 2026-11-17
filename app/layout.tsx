import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import AppShell from "@/components/AppShell";

// Self-hosted (SIL Open Font License) so builds never depend on fetching Google Fonts.
const display = localFont({ src: "./fonts/Fraunces-Variable-latin.woff2", variable: "--font-display-face", weight: "100 900", display: "swap" });
const body = localFont({ src: "./fonts/DMSans-Variable-latin.woff2", variable: "--font-body", weight: "100 1000", display: "swap" });

export const metadata: Metadata = {
  title: { default: "SewCraft — Your next creation starts here", template: "%s · SewCraft" },
  description: "Discover, prepare, measure, cut and sew — guided sewing projects with accurate patterns.",
  manifest: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/manifest.webmanifest`,
};

export const viewport: Viewport = { themeColor: "#faf6ef", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
