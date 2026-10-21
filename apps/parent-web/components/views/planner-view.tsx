"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import * as api from "@/lib/api";
import { toApiError } from "@/lib/api";
import { AGE_BAND_INFO, STATUS_LABEL } from "@/lib/format";
import { AGE_BANDS, type AgeBand, type Mission, type PromptCategory } from "@/lib/types";
import { useResource } from "@/lib/use-resource";
import { HouseholdGate, useReadyHousehold } from "../household-context";
import { Badge, Button, EmptyState, LoadingBlock, Notice, PageHeader, SectionTitle } from "../ui";
import { MissionDetails, MissionFacts } from "./approvals-view";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
type Day = (typeof DAYS)[number];
type Plan = Partial<Record<Day, string[]>>;

const CATEGORIES: Array<{ value: PromptCategory; label: string }> = [
  { value: "indoor", label: "Indoor play" },
  { value: "outdoor", label: "Outdoors" },
  { value: "creative", label: "Making & creating" },
  { value: "kitchen", label: "Kitchen adventures" },
  { value: "movement", label: "Get moving" },
  { value: "calm", label: "Calm & cozy" },
];

export function PlannerView() {
  return (
    <>
      <PageHeader eyebrow="Weekly adventure planner" title="Plan a week worth remembering">
        Pick adventures from your library, give them a day, and add fresh ideas. Children still ask on the
        TV — you stay in charge of every yes.
      </PageHeader>
      <HouseholdGate>
        <Planner />
      </HouseholdGate>
    </>
  );
}

function Planner() {
  const { household } = useReadyHousehold();
  const storageKey = `familyflow.planner.v1.${household.id}`;
  const fetchMissions = useCallback(() => api.listMissions(), []);
  const missions = useResource(fetchMissions);

  const [plan, setPlan] = useState<Plan>({});
  const [loadedPlan, setLoadedPlan] = useState(false);

  // Day assignments are a parent-only planning aid kept in this browser (not sent to the API).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setPlan(JSON.parse(raw) as Plan);
    } catch {
      /* ignore corrupt local data */
    }
    setLoadedPlan(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loadedPlan) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(plan));
    } catch {
      /* storage may be unavailable */
    }
  }, [plan, storageKey, loadedPlan]);

  const list = missions.data ?? [];
  const byId = new Map(list.map((m) => [m.id, m]));

  function assign(missionId: string, day: Day) {
    setPlan((p) => {
      const current = p[day] ?? [];
      if (current.includes(missionId)) return p;
      return { ...p, [day]: [...current, missionId] };
    });
  }
  function unassign(missionId: string, day: Day) {
    setPlan((p) => ({ ...p, [day]: (p[day] ?? []).filter((id) => id !== missionId) }));
  }

  return (
    <div className="space-y-10">
      <section aria-labelledby="week-h">
        <SectionTitle id="week-h">This week</SectionTitle>
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {DAYS.map((day) => {
            const ids = (plan[day] ?? []).filter((id) => byId.has(id));
            return (
              <li key={day} className="ff-card !p-4">
                <h3 className="text-lg font-semibold">{day}</h3>
                {ids.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-soft">Open day — maybe a slow one.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {ids.map((id) => {
                      const m = byId.get(id)!;
                      return (
                        <li key={id} className="rounded-xl bg-forest-50 p-2.5">
                          <p className="font-semibold leading-snug text-forest-950">{m.title}</p>
                          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                            <Badge tone={STATUS_LABEL[m.status].tone}>{STATUS_LABEL[m.status].label}</Badge>
                            <button
                              type="button"
                              onClick={() => unassign(id, day)}
                              className="min-h-8 rounded-lg px-2 text-sm font-semibold text-forest-700 underline underline-offset-2 hover:bg-forest-100"
                              aria-label={`Remove ${m.title} from ${day}`}
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-sm text-ink-soft">
          Day plans are saved in this browser only, as your own reminder. Statuses come live from FamilyFlow.
        </p>
      </section>

      <GenerateCard onCreated={() => missions.reload(true)} />

      <section aria-labelledby="lib-h">
        <SectionTitle id="lib-h">Adventure library ({list.length})</SectionTitle>
        {missions.loading && !missions.data ? (
          <LoadingBlock label="Loading adventures…" />
        ) : missions.error && !missions.data ? (
          <Notice tone="error">{missions.error.message}</Notice>
        ) : list.length === 0 ? (
          <EmptyState title="The library is empty">Generate an adventure above to get started.</EmptyState>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {list.map((m) => (
              <MissionCard key={m.id} mission={m} onAssign={(d) => assign(m.id, d)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MissionCard({ mission, onAssign }: { mission: Mission; onAssign: (d: Day) => void }) {
  const s = STATUS_LABEL[mission.status];
  const selectId = `plan-${mission.id}`;
  return (
    <li className="ff-card flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-semibold">{mission.title}</h3>
        <Badge tone={s.tone}>{s.label}</Badge>
      </div>
      <MissionFacts mission={mission} />
      <MissionDetails mission={mission} />
      <div className="mt-auto pt-4">
        <label htmlFor={selectId} className="ff-label">
          Plan for…
        </label>
        <select
          id={selectId}
          className="ff-input max-w-56"
          value=""
          onChange={(e) => {
            if (e.target.value) onAssign(e.target.value as Day);
          }}
        >
          <option value="">Choose a day</option>
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
    </li>
  );
}

function GenerateCard({ onCreated }: { onCreated: () => Promise<void> }) {
  const [category, setCategory] = useState<PromptCategory>("indoor");
  const [bands, setBands] = useState<AgeBand[]>(["7-12"]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: "success" | "error"; title?: string; text: string } | null>(null);

  function toggle(b: AgeBand) {
    setBands((cur) => (cur.includes(b) ? cur.filter((x) => x !== b) : [...cur, b]));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (bands.length === 0) {
      setResult({ tone: "error", text: "Pick at least one age group." });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const r = await api.generateMission(category, bands);
      setResult({ tone: "success", title: `Added “${r.mission.title}”`, text: r.labeled });
      await onCreated();
    } catch (err) {
      setResult({ tone: "error", text: toApiError(err).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="gen-h" className="ff-card">
      <h2 id="gen-h" className="text-2xl font-semibold">
        Find a new adventure
      </h2>
      <p className="mt-1 max-w-2xl text-ink-soft">
        FamilyFlow suggests an adventure and checks it against safety rules (no purchases, no sharing
        location, nothing risky). If AI isn&apos;t available it uses the curated library, and it always says
        which. You still approve every request before a child plays.
      </p>
      <form onSubmit={onSubmit} className="mt-4 grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="cat" className="ff-label">
            What kind of day is it?
          </label>
          <select
            id="cat"
            className="ff-input"
            value={category}
            onChange={(e) => setCategory(e.target.value as PromptCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <fieldset>
          <legend className="ff-label">Who is it for?</legend>
          <div className="flex flex-wrap gap-2">
            {AGE_BANDS.map((b) => (
              <label
                key={b}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-forest-300 bg-white px-3 has-[:checked]:border-forest-700 has-[:checked]:bg-forest-100"
              >
                <input
                  type="checkbox"
                  className="size-5 accent-forest-700"
                  checked={bands.includes(b)}
                  onChange={() => toggle(b)}
                />
                <span>
                  {AGE_BAND_INFO[b].label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="md:col-span-2">
          <Button type="submit" variant="lantern" busy={busy}>
            Suggest an adventure
          </Button>
        </div>
      </form>
      <div aria-live="polite" className="mt-4">
        {result && (
          <Notice tone={result.tone} title={result.title}>
            {result.text}
          </Notice>
        )}
      </div>
    </section>
  );
}
