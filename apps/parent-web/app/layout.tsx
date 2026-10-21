import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { HouseholdProvider } from "@/components/household-context";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "opsz"],
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FamilyFlow — Less scrolling. More living together.",
    template: "%s · FamilyFlow",
  },
  description:
    "The FamilyFlow parent dashboard: approve adventures, plan the week, and keep screen time connected to real life.",
};

export const viewport: Viewport = {
  themeColor: "#25402a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${sourceSans.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only z-50 rounded-xl bg-lantern-300 px-4 py-2 font-semibold text-forest-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to main content
        </a>
        <HouseholdProvider>
          <AppShell>{children}</AppShell>
        </HouseholdProvider>
      </body>
    </html>
  );
}
