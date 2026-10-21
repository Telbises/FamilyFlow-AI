"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { API_BASE_URL, LOCAL_PARENT_TOKEN } from "@/lib/config";
import { cx } from "@/lib/format";
import { useHousehold } from "./household-context";
import { Icon, type IconName } from "./ui";

const NAV: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/", label: "Overview", icon: "home" },
  { href: "/approvals", label: "Pending approvals", icon: "check" },
  { href: "/planner", label: "Weekly planner", icon: "calendar" },
  { href: "/children", label: "Children & permissions", icon: "family" },
  { href: "/rewards", label: "Rewards", icon: "star" },
  { href: "/activity", label: "Activity history", icon: "clock" },
  { href: "/settings", label: "Settings & data", icon: "shield" },
];

export function Lantern({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className={className}>
      <path d="M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M10 8h12l2 4v10l-2 4H10l-2-4V12z" fill="#fcc54a" />
      <path d="M10 8h12l2 4H8z" fill="#d98f0c" />
      <path d="M10 26h12l-1.5 3h-9z" fill="#d98f0c" />
      <ellipse cx="16" cy="17" rx="3.2" ry="4.4" fill="#fff8e6" className="ff-glow" />
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { pendingCount } = useHousehold();

  return (
    <div className="lg:pl-72">
      <aside className="sticky top-0 z-30 bg-forest-900 text-forest-50 shadow-lg lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-72 lg:flex-col lg:overflow-y-auto">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(420px 260px at 0% 0%, rgb(106 154 104 / .35), transparent 70%), radial-gradient(360px 280px at 100% 100%, rgb(242 170 28 / .16), transparent 70%)",
          }}
        />
        <div className="relative flex items-center gap-2.5 px-4 pb-2 pt-3 lg:px-6 lg:pb-4 lg:pt-7">
          <Lantern className="size-8 text-lantern-200 lg:size-10" />
          <div>
            <p className="font-display text-2xl font-semibold leading-none tracking-tight text-white lg:text-3xl">
              FamilyFlow
            </p>
            <p className="mt-1 hidden text-sm text-forest-200 lg:block">Parent dashboard</p>
          </div>
        </div>

        <nav
          aria-label="Main"
          className="relative flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-4 lg:pb-4 lg:pt-2"
        >
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex min-h-11 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-base font-semibold transition-colors",
                  active
                    ? "bg-lantern-300 text-forest-950"
                    : "text-forest-100 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.href === "/approvals" && pendingCount > 0 && (
                  <span
                    className={cx(
                      "ml-auto rounded-full px-2 text-sm font-bold",
                      active ? "bg-forest-900 text-lantern-200" : "bg-lantern-300 text-forest-950",
                    )}
                  >
                    {pendingCount}
                    <span className="sr-only"> waiting</span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="relative hidden border-t border-white/10 px-6 py-5 text-sm text-forest-200 lg:block">
          <p className="font-display text-base italic text-lantern-200">
            Less scrolling. More living together.
          </p>
          <p className="mt-3">
            Parents see FamilyFlow activity only — never unrelated Alexa or Amazon data.
          </p>
        </div>
      </aside>

      <div
        role="note"
        className="border-b border-lantern-400 bg-lantern-100 px-4 py-2 text-sm text-lantern-900"
      >
        <strong className="font-bold uppercase tracking-wide">Local demo only.</strong> Signed in with
        the development token <code className="rounded bg-white/60 px-1">Bearer {LOCAL_PARENT_TOKEN}</code>{" "}
        against <code className="rounded bg-white/60 px-1">{API_BASE_URL}</code>. This is not real
        authentication — never use it outside your own machine.
      </div>

      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-10">
        {children}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 text-sm text-ink-soft sm:px-8">
        FamilyFlow is a hackathon prototype. Privacy descriptions here are product behavior, not a
        legal or compliance certification.
      </footer>
    </div>
  );
}
