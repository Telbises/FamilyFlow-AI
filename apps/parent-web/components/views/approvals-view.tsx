"use client";

import { useCallback, useState } from "react";
import * as api from "@/lib/api";
import { toApiError } from "@/lib/api";
import { AGE_BAND_INFO, SOURCE_LABEL, formatDateTime, relativeTime } from "@/lib/format";
import type { Decision, Mission } from "@/lib/types";
import { useResource } from "@/lib/use-resource";
import { HouseholdGate, useReadyHousehold } from "../household-context";
import { Badge, Button, EmptyState, LoadingBlock, Notice, PageHeader, PrivacyNote, SectionTitle } from "../ui";

export function ApprovalsView() {
  return (
    <>
      <PageHeader eyebrow="Pending approvals" title="Your yes makes it happen">
        Children can ask for adventures and say when they&apos;re done. Nothing starts and no points are
        awarded until you decide.
      </PageHeader>
      <HouseholdGate>
        <Approvals />
      </HouseholdGate>
    </>
  );
}

function Approvals() {
  const { members, refresh } = useReadyHousehold();
  const load = useCallback(async () => {
    const [approvals, missions] = await Promise.all([api.listApprovals(), api.listMissions()]);
    return { approvals, missions };
  }, []);
  const res = useResource(load);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const nameOf = (id: string) => members.find((m) => m.id === id)?.displayName ?? "A child";
  const missionOf = (id: string): Mission | undefined => res.data?.missions.find((m) => m.id === id);

  async function decideRequest(id: string, decision: Decision, who: string, title: string) {
    setBusyId(id);
    setMessage(null);
    try {
      await api.decideApproval(id, decision);
      setMessage({
        tone: "success",
        text:
          decision === "approved"
            ? `Approved — ${who} can start “${title}”.`
            : `Not this time — “${title}” goes back for ${who} to try something else.`,
      });
      await Promise.all([res.reload(true), refresh()]);
    } catch (e) {
      setMessage({ tone: "error", text: toApiError(e).message });
    } finally {
      setBusyId(null);
    }
  }

  async function decideCompletion(id: string, decision: Decision, who: string, title: string) {
    setBusyId(id);
    setMessage(null);
    try {
      const r = await api.decideCompletion(id, decision);
      const unlocked = r.unlockedRewards.map((u) => u.title);
      setMessage({
        tone: "success",
        text:
          decision === "approved"
            ? `Nicely done! “${title}” is complete for ${who}. Family points: ${r.totalPoints}.${
                unlocked.length ? ` Reward unlocked: ${unlocked.join(", ")}!` : ""
              }`
            : `Marked as not finished yet — ${who} can keep working on “${title}”.`,
      });
      await Promise.all([res.reload(true), refresh()]);
    } catch (e) {
      setMessage({ tone: "error", text: toApiError(e).message });
    } finally {
      setBusyId(null);
    }
  }

  if (res.loading && !res.data) return <LoadingBlock label="Checking for requests…" />;
  if (res.error && !res.data) {
    return (
      <div className="space-y-3">
        <Notice tone="error">{res.error.message}</Notice>
        <Button variant="outline" onClick={() => void res.reload()}>
          Try again
        </Button>
      </div>
    );
  }

  const requests = res.data?.approvals.requests ?? [];
  const completions = res.data?.approvals.completions ?? [];

  return (
    <div className="space-y-8">
      <div aria-live="polite">{message && <Notice tone={message.tone}>{message.text}</Notice>}</div>

      <section aria-labelledby="req-h">
        <SectionTitle id="req-h">Adventure requests ({requests.length})</SectionTitle>
        {requests.length === 0 ? (
          <EmptyState title="No adventures waiting">
            When a child picks one on the Fire TV or asks Alexa, it will appear here.
          </EmptyState>
        ) : (
          <ul className="space-y-4">
            {requests.map((r) => {
              const mission = missionOf(r.missionId);
              const who = nameOf(r.memberId);
              const title = mission?.title ?? "this adventure";
              return (
                <li key={r.id} className="ff-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-ink-soft">
                        <strong className="text-forest-950">{who}</strong> asked via {SOURCE_LABEL[r.source]} ·{" "}
                        <time dateTime={r.createdAt}>{relativeTime(r.createdAt)}</time>
                      </p>
                      <h3 className="mt-1 text-2xl font-semibold">{mission?.title ?? "Adventure"}</h3>
                      {mission && <MissionFacts mission={mission} />}
                    </div>
                    <Badge tone="amber">Waiting for you</Badge>
                  </div>
                  {mission && <MissionDetails mission={mission} />}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      variant="primary"
                      busy={busyId === r.id}
                      disabled={busyId !== null}
                      onClick={() => decideRequest(r.id, "approved", who, title)}
                      aria-label={`Approve ${title} for ${who}`}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busyId !== null}
                      onClick={() => decideRequest(r.id, "rejected", who, title)}
                      aria-label={`Decline ${title} for ${who}`}
                    >
                      Not this time
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="comp-h">
        <SectionTitle id="comp-h">Finished adventures to check ({completions.length})</SectionTitle>
        {completions.length === 0 ? (
          <EmptyState title="Nothing to celebrate yet">
            When a child says they&apos;re done, you&apos;ll confirm it here — that&apos;s when points are awarded.
          </EmptyState>
        ) : (
          <ul className="space-y-4">
            {completions.map((c) => {
              const mission = missionOf(c.missionId);
              const who = nameOf(c.requestedBy);
              const title = mission?.title ?? "this adventure";
              return (
                <li key={c.id} className="ff-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-ink-soft">
                        <strong className="text-forest-950">{who}</strong> says they&apos;re done ·{" "}
                        <time dateTime={c.createdAt}>{formatDateTime(c.createdAt)}</time>
                      </p>
                      <h3 className="mt-1 text-2xl font-semibold">{mission?.title ?? "Adventure"}</h3>
                    </div>
                    <Badge tone="amber">Check it</Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      variant="lantern"
                      busy={busyId === c.id}
                      disabled={busyId !== null}
                      onClick={() => decideCompletion(c.id, "approved", who, title)}
                      aria-label={`Confirm ${title} is complete for ${who} and award points`}
                    >
                      Confirm &amp; award points
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busyId !== null}
                      onClick={() => decideCompletion(c.id, "rejected", who, title)}
                      aria-label={`Not finished yet: ${title} for ${who}`}
                    >
                      Not finished yet
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <PrivacyNote />
    </div>
  );
}

export function MissionFacts({ mission }: { mission: Mission }) {
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-soft">
      <span>{mission.estimatedMinutes} min</span>
      <span aria-hidden="true">·</span>
      <span>{mission.ageBands.map((b) => AGE_BAND_INFO[b].label).join(", ")}</span>
      <span aria-hidden="true">·</span>
      <span>{mission.origin === "bedrock" ? "AI-assisted (parent-reviewed)" : "Curated library"}</span>
    </p>
  );
}

export function MissionDetails({ mission }: { mission: Mission }) {
  const hasDetail = (mission.steps?.length ?? 0) + (mission.materials?.length ?? 0) > 0;
  if (!hasDetail) return null;
  return (
    <details className="mt-3 rounded-2xl bg-forest-50/70 px-4 py-3">
      <summary className="cursor-pointer font-semibold text-forest-900">
        Steps, materials &amp; safety notes
      </summary>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {mission.materials && mission.materials.length > 0 && (
          <div>
            <h4 className="font-semibold text-forest-900">You&apos;ll need</h4>
            <ul className="mt-1 list-disc pl-5 text-ink-soft">
              {mission.materials.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        {mission.safetyNotes && mission.safetyNotes.length > 0 && (
          <div>
            <h4 className="font-semibold text-forest-900">Safety notes</h4>
            <ul className="mt-1 list-disc pl-5 text-ink-soft">
              {mission.safetyNotes.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        {mission.steps && mission.steps.length > 0 && (
          <div className="sm:col-span-2">
            <h4 className="font-semibold text-forest-900">Steps</h4>
            <ol className="mt-1 list-decimal pl-5 text-ink-soft">
              {mission.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </details>
  );
}
