"use client";

import Link from "next/link";
import { useCallback } from "react";
import * as api from "@/lib/api";
import { actorName, eventDetails, eventLabel, relativeTime } from "@/lib/format";
import { useResource } from "@/lib/use-resource";
import { HouseholdGate, useHousehold, useReadyHousehold } from "../household-context";
import { Badge, Icon, LoadingBlock, PrivacyNote, SectionTitle, type IconName } from "../ui";

export function OverviewView() {
  return (
    <div className="space-y-10">
      <Hero />
      <HouseholdGate>
        <Dashboard />
      </HouseholdGate>
    </div>
  );
}

function Hero() {
  const { state } = useHousehold();
  return (
    <section
      aria-labelledby="brand"
      className="ff-rise relative overflow-hidden rounded-[2rem] bg-forest-800 px-6 py-10 text-white shadow-[0_30px_60px_-30px_rgb(16_30_21/0.7)] sm:px-10 sm:py-14"
      style={{
        backgroundImage:
          "radial-gradient(700px 360px at 85% 0%, rgb(242 170 28 / .32), transparent 65%), radial-gradient(600px 420px at 0% 100%, rgb(106 154 104 / .45), transparent 65%), linear-gradient(160deg, #2e5033 0%, #1b3022 100%)",
      }}
    >
      <HeroArt />
      <div className="relative max-w-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-lantern-200">
          Welcome home{state.status === "ready" ? "" : ", parent"}
        </p>
        <h1
          id="brand"
          className="mt-2 font-display text-6xl font-semibold leading-[0.95] tracking-tight text-white sm:text-8xl"
        >
          FamilyFlow<span className="text-lantern-300">.</span>
        </h1>
        <p className="mt-4 font-display text-2xl italic text-lantern-100 sm:text-3xl">
          Less scrolling. More living together.
        </p>
        <p className="mt-5 max-w-xl text-lg text-forest-100">
          Kids ask for an adventure on the Fire TV or with Alexa. You say yes. The living room turns into
          a trail, a kitchen lab, or a blanket fort — and everyone earns something worth sharing.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/approvals"
            className="inline-flex min-h-11 items-center rounded-xl bg-lantern-300 px-5 py-2 text-base font-semibold text-forest-950 hover:bg-lantern-200"
          >
            Review approvals
          </Link>
          <Link
            href="/planner"
            className="inline-flex min-h-11 items-center rounded-xl border border-white/40 px-5 py-2 text-base font-semibold text-white hover:bg-white/10"
          >
            Plan the week
          </Link>
        </div>
      </div>
    </section>
  );
}

function HeroArt() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 480 320"
      className="pointer-events-none absolute -bottom-2 right-0 hidden h-72 w-auto opacity-95 md:block lg:h-80"
      preserveAspectRatio="xMaxYMax meet"
    >
      <circle cx="360" cy="86" r="54" fill="#fcc54a" opacity=".28" />
      <circle cx="360" cy="86" r="30" fill="#fcc54a" className="ff-glow" />
      <path d="M0 250 C70 190 130 200 190 232 C250 262 320 180 400 205 C440 218 465 230 480 238 V320 H0Z" fill="#386439" />
      <path d="M0 285 C80 240 170 255 240 276 C310 296 390 250 480 272 V320 H0Z" fill="#25402a" />
      <path d="M215 320 C225 290 250 275 290 262 C320 252 350 250 372 248" stroke="#fcc54a" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".7" strokeDasharray="2 12" />
      <g transform="translate(300 160)">
        <path d="M0 52 L48 12 L96 52 V104 H0Z" fill="#1b3022" />
        <path d="M-6 54 L48 6 L102 54" stroke="#6a9a68" strokeWidth="6" strokeLinecap="round" fill="none" />
        <rect x="18" y="62" width="24" height="26" rx="4" fill="#fcc54a" className="ff-glow" />
        <rect x="56" y="62" width="22" height="42" rx="4" fill="#f2aa1c" opacity=".85" />
      </g>
      <g fill="#1b3022">
        <path d="M70 238 l18 -54 l18 54z M76 220 l12 -38 l12 38z" opacity=".95" />
        <path d="M118 244 l14 -44 l14 44z" opacity=".9" />
      </g>
    </svg>
  );
}

function Dashboard() {
  const { household, members, points } = useReadyHousehold();
  const { pendingCount } = useHousehold();
  const fetchMissions = useCallback(() => api.listMissions(), []);
  const fetchAudit = useCallback(() => api.listAuditEvents(), []);
  const missions = useResource(fetchMissions);
  const audit = useResource(fetchAudit);

  const children = members.filter((m) => m.role === "child" && m.active);
  const library = (missions.data ?? []).filter((m) => m.status === "available").length;

  const steps: Array<{ done: boolean; title: string; body: string; href: string; cta: string }> = [
    {
      done: true,
      title: "Family space created",
      body: `Time zone ${household.timezone}. Starter adventures are in your library.`,
      href: "/planner",
      cta: "Browse adventures",
    },
    {
      done: children.length > 0,
      title: "Add a child profile",
      body: "Each child gets a clear, age-appropriate notice about what parents can see.",
      href: "/children",
      cta: "Add a child",
    },
    {
      done: false,
      title: "Pair the Fire TV",
      body: "Create a 6-digit code and enter it on the TV. Codes expire in minutes.",
      href: "/children#pairing",
      cta: "Get a pairing code",
    },
  ];

  return (
    <>
      <section aria-labelledby="today" className="ff-rise">
        <SectionTitle id="today">Today in your family space</SectionTitle>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            icon="check"
            label="Waiting for you"
            value={pendingCount}
            note={pendingCount === 0 ? "All caught up" : "Requests & completions"}
            href="/approvals"
            highlight={pendingCount > 0}
          />
          <Stat icon="star" label="Family points" value={points} note="Earned with your approval" href="/rewards" />
          <Stat icon="family" label="Children" value={children.length} note="Active profiles" href="/children" />
          <Stat
            icon="calendar"
            label="Adventures ready"
            value={missions.loading ? "…" : library}
            note="In your library"
            href="/planner"
          />
        </ul>
      </section>

      <section aria-labelledby="start" className="grid gap-6 lg:grid-cols-5">
        <div className="ff-card lg:col-span-3">
          <SectionTitle id="start">Getting the family going</SectionTitle>
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-3 rounded-2xl bg-forest-50/70 p-3.5">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                    s.done ? "bg-forest-600 text-white" : "bg-lantern-200 text-lantern-900"
                  }`}
                >
                  {s.done ? "✓" : i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-forest-950">
                    {s.title} {s.done && <span className="sr-only">(done)</span>}
                  </p>
                  <p className="text-ink-soft">{s.body}</p>
                  {!s.done && (
                    <Link href={s.href} className="mt-1 inline-block font-semibold text-forest-700 underline underline-offset-4 hover:text-forest-900">
                      {s.cta}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="ff-card lg:col-span-2">
          <SectionTitle>How an adventure flows</SectionTitle>
          <ol className="space-y-3 text-ink-soft">
            <li>
              <strong className="text-forest-900">1. Ask.</strong> A child picks an adventure on the Fire TV or asks Alexa.
            </li>
            <li>
              <strong className="text-forest-900">2. Approve.</strong> It lands in <em>Pending approvals</em>. Nothing starts without you.
            </li>
            <li>
              <strong className="text-forest-900">3. Do it together.</strong> Build, bake, wander, wonder.
            </li>
            <li>
              <strong className="text-forest-900">4. Celebrate.</strong> You confirm it&apos;s done and award points toward family rewards.
            </li>
          </ol>
        </div>
      </section>

      <section aria-labelledby="latest" className="ff-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <SectionTitle id="latest">Latest moments</SectionTitle>
          <Link href="/activity" className="font-semibold text-forest-700 underline underline-offset-4">
            See all activity
          </Link>
        </div>
        {audit.loading ? (
          <LoadingBlock label="Loading activity…" />
        ) : audit.error ? (
          <p className="text-ink-soft">Activity couldn&apos;t be loaded: {audit.error.message}</p>
        ) : (audit.data ?? []).length === 0 ? (
          <p className="text-ink-soft">Nothing yet — your first approved adventure will show up here.</p>
        ) : (
          <ul className="divide-y divide-forest-100">
            {(audit.data ?? []).slice(0, 5).map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>
                  <span className="font-semibold text-forest-950">{eventLabel(e)}</span>
                  <span className="text-ink-soft">
                    {" "}
                    · {actorName(e, members)}
                    {eventDetails(e).length > 0 && ` · ${eventDetails(e).join(" · ")}`}
                  </span>
                </span>
                <time dateTime={e.timestamp} className="text-sm text-ink-soft">
                  {relativeTime(e.timestamp)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PrivacyNote />
    </>
  );
}

function Stat({
  icon,
  label,
  value,
  note,
  href,
  highlight,
}: {
  icon: IconName;
  label: string;
  value: number | string;
  note: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={`group block h-full rounded-3xl border p-5 transition-shadow hover:shadow-lg ${
          highlight
            ? "border-lantern-400 bg-lantern-50"
            : "border-forest-200/70 bg-white/80"
        }`}
      >
        <div className="flex items-center justify-between text-forest-700">
          <Icon name={icon} className="size-6" />
          {highlight && <Badge tone="amber">Needs you</Badge>}
        </div>
        <p className="mt-3 font-display text-5xl font-semibold text-forest-900">{value}</p>
        <p className="mt-1 font-semibold text-forest-950">{label}</p>
        <p className="text-sm text-ink-soft">{note}</p>
      </Link>
    </li>
  );
}
