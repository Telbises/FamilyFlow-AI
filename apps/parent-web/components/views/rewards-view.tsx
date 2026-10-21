"use client";

import { useCallback } from "react";
import * as api from "@/lib/api";
import { REWARD_LADDER } from "@/lib/config";
import { formatDateTime } from "@/lib/format";
import { useResource } from "@/lib/use-resource";
import { HouseholdGate } from "../household-context";
import { Badge, Button, EmptyState, LoadingBlock, Notice, PageHeader, SectionTitle } from "../ui";

export function RewardsView() {
  return (
    <>
      <PageHeader eyebrow="Rewards" title="Points that turn into time together">
        Every confirmed adventure earns the whole family points. Rewards are shared experiences — never
        purchases.
      </PageHeader>
      <HouseholdGate>
        <Rewards />
      </HouseholdGate>
    </>
  );
}

function Rewards() {
  const load = useCallback(() => api.listRewards(), []);
  const res = useResource(load);

  if (res.loading && !res.data) return <LoadingBlock label="Counting up the points…" />;
  if (res.error && !res.data)
    return (
      <div className="space-y-3">
        <Notice tone="error">{res.error.message}</Notice>
        <Button variant="outline" onClick={() => void res.reload()}>
          Try again
        </Button>
      </div>
    );

  const points = res.data?.points ?? 0;
  const unlocked = res.data?.rewards ?? [];
  const next = REWARD_LADDER.find((r) => r.points > points);
  const prev = [...REWARD_LADDER].reverse().find((r) => r.points <= points)?.points ?? 0;
  const pct = next ? Math.round(((points - prev) / (next.points - prev)) * 100) : 100;

  return (
    <div className="space-y-8">
      <section
        aria-labelledby="pts-h"
        className="relative overflow-hidden rounded-3xl bg-forest-800 p-6 text-white sm:p-8"
        style={{
          backgroundImage:
            "radial-gradient(500px 260px at 100% 0%, rgb(242 170 28 / .35), transparent 65%), linear-gradient(160deg,#2e5033,#1b3022)",
        }}
      >
        <h2 id="pts-h" className="!text-forest-100 text-lg font-semibold">
          Family points
        </h2>
        <p className="mt-1 font-display text-7xl font-semibold text-lantern-200">{points}</p>
        <div className="mt-4 max-w-xl">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label="Progress to next reward"
            className="h-3 overflow-hidden rounded-full bg-white/20"
          >
            <div className="h-full rounded-full bg-lantern-300" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-forest-100">
            {next
              ? `${next.points - points} more point${next.points - points === 1 ? "" : "s"} until “${next.title}”.`
              : "Every reward on the trail is unlocked. What a family!"}
          </p>
        </div>
      </section>

      <section aria-labelledby="ladder-h">
        <SectionTitle id="ladder-h">The reward trail</SectionTitle>
        <ol className="grid gap-4 md:grid-cols-3">
          {REWARD_LADDER.map((r) => {
            const got = unlocked.find((u) => u.title === r.title);
            const reached = points >= r.points;
            return (
              <li
                key={r.title}
                className={`ff-card ${reached ? "!border-lantern-400 !bg-lantern-50" : ""}`}
              >
                <p className="text-sm font-bold uppercase tracking-wide text-lantern-700">{r.points} points</p>
                <h3 className="mt-1 text-xl font-semibold">{r.title}</h3>
                <p className="mt-2">
                  {got ? (
                    <Badge tone="amber">Unlocked {formatDateTime(got.createdAt)}</Badge>
                  ) : reached ? (
                    <Badge tone="amber">Unlocking</Badge>
                  ) : (
                    <Badge tone="neutral">Not yet</Badge>
                  )}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="earned-h">
        <SectionTitle id="earned-h">Unlocked rewards ({unlocked.length})</SectionTitle>
        {unlocked.length === 0 ? (
          <EmptyState title="No rewards unlocked yet">
            Confirm a finished adventure under Pending approvals to start earning.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {unlocked.map((r) => (
              <li key={r.id} className="ff-card flex flex-wrap items-center justify-between gap-2 !py-4">
                <span className="font-display text-xl font-semibold text-forest-900">{r.title}</span>
                <span className="text-ink-soft">
                  {r.points} pts · {formatDateTime(r.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
