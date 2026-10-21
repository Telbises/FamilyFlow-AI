"use client";

import { useCallback, useState } from "react";
import * as api from "@/lib/api";
import { ACTOR_LABEL, actorName, eventDetails, eventLabel, formatDateTime } from "@/lib/format";
import type { ActorType } from "@/lib/types";
import { useResource } from "@/lib/use-resource";
import { HouseholdGate, useReadyHousehold } from "../household-context";
import { Badge, Button, EmptyState, LoadingBlock, Notice, PageHeader, PrivacyNote } from "../ui";

export function ActivityView() {
  return (
    <>
      <PageHeader eyebrow="Activity history" title="What happened in FamilyFlow">
        A transparent record of actions inside FamilyFlow — who asked, who decided, and when.
      </PageHeader>
      <HouseholdGate>
        <Activity />
      </HouseholdGate>
    </>
  );
}

function Activity() {
  const { members } = useReadyHousehold();
  const fetchEvents = useCallback(() => api.listAuditEvents(), []);
  const fetchSettings = useCallback(() => api.getSettings(), []);
  const events = useResource(fetchEvents);
  const settings = useResource(fetchSettings);
  const [filter, setFilter] = useState<ActorType | "all">("all");

  if (events.loading && !events.data) return <LoadingBlock label="Loading history…" />;
  if (events.error && !events.data)
    return (
      <div className="space-y-3">
        <Notice tone="error">{events.error.message}</Notice>
        <Button variant="outline" onClick={() => void events.reload()}>
          Try again
        </Button>
      </div>
    );

  const all = events.data ?? [];
  const shown = filter === "all" ? all : all.filter((e) => e.actorType === filter);

  return (
    <div className="space-y-6">
      <PrivacyNote />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <label htmlFor="actor-filter" className="ff-label">
            Show activity from
          </label>
          <select
            id="actor-filter"
            className="ff-input w-64"
            value={filter}
            onChange={(e) => setFilter(e.target.value as ActorType | "all")}
          >
            <option value="all">Everyone</option>
            {(Object.keys(ACTOR_LABEL) as ActorType[]).map((a) => (
              <option key={a} value={a}>
                {ACTOR_LABEL[a]}
              </option>
            ))}
          </select>
        </div>
        <Button variant="outline" onClick={() => void events.reload(true)}>
          Refresh
        </Button>
      </div>

      {shown.length === 0 ? (
        <EmptyState title="No activity to show">Events appear here as your family uses FamilyFlow.</EmptyState>
      ) : (
        <ol className="relative space-y-3 border-l-2 border-forest-200 pl-5">
          {shown.map((e) => {
            const details = eventDetails(e);
            return (
              <li key={e.id} className="ff-card relative !p-4">
                <span
                  aria-hidden="true"
                  className="absolute -left-[1.72rem] top-5 size-3 rounded-full border-2 border-white bg-lantern-400"
                />
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-forest-950">{eventLabel(e)}</p>
                  <time dateTime={e.timestamp} className="text-sm text-ink-soft">
                    {formatDateTime(e.timestamp)}
                  </time>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-ink-soft">
                  <Badge tone={e.actorType === "parent" ? "green" : "neutral"}>{actorName(e, members)}</Badge>
                  {details.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      <p className="text-sm text-ink-soft">
        Showing up to the latest {all.length} events.
        {settings.data &&
          ` Activity records are kept for ${settings.data.retention.audit} days; requests for ${settings.data.retention.requests} days.`}
      </p>
    </div>
  );
}
