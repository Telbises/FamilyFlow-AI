"use client";

import { useEffect, useState, type FormEvent } from "react";
import * as api from "@/lib/api";
import { toApiError } from "@/lib/api";
import { AGE_BAND_INFO, formatDateTime } from "@/lib/format";
import { AGE_BANDS, type AgeBand, type PairingCode } from "@/lib/types";
import { HouseholdGate, useReadyHousehold } from "../household-context";
import { Badge, Button, EmptyState, Icon, Notice, PageHeader, SectionTitle } from "../ui";

/** What the child is told, worded for their age. Shown to the parent before the profile is created. */
const CHILD_NOTICE: Record<AgeBand, string> = {
  "3-6":
    "Grown-ups can see the adventures you pick and finish in FamilyFlow, so they can say yes and cheer for you. They can't see anything else.",
  "7-12":
    "Your parents can see what you do in FamilyFlow: adventures you ask for, ones you finish, and the points you earn. They can't see your other Alexa chats or what you do in other apps through FamilyFlow.",
  "13-17":
    "Your parents can see your FamilyFlow activity: adventure requests, approvals, completions and points. FamilyFlow doesn't show them your other Alexa conversations, Amazon activity, other Fire TV apps or device data.",
};

export function ChildrenView() {
  return (
    <>
      <PageHeader eyebrow="Children & permissions" title="Who's adventuring?">
        Add each child with a clear, honest notice about what parents can see. Then pair the family TV.
      </PageHeader>
      <HouseholdGate>
        <Children />
      </HouseholdGate>
    </>
  );
}

function Children() {
  const { members } = useReadyHousehold();
  const children = members.filter((m) => m.role === "child" && m.active);

  return (
    <div className="space-y-10">
      <section aria-labelledby="kids-h">
        <SectionTitle id="kids-h">Child profiles ({children.length})</SectionTitle>
        {children.length === 0 ? (
          <EmptyState title="No children added yet">Add your first explorer below.</EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((c) => (
              <li key={c.id} className="ff-card flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className="grid size-14 shrink-0 place-items-center rounded-2xl bg-lantern-200 font-display text-2xl font-semibold text-lantern-900"
                >
                  {c.displayName.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-xl font-semibold">{c.displayName}</h3>
                  {c.ageBand && (
                    <p className="text-ink-soft">
                      {AGE_BAND_INFO[c.ageBand].label} · {AGE_BAND_INFO[c.ageBand].nickname}
                    </p>
                  )}
                  <p className="mt-1.5">
                    <Badge tone="green">Notice shared {formatDateTime(c.visibilityNoticeAcknowledgedAt)}</Badge>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PermissionsTable />
      <AddChildCard />
      <PairingCard />
    </div>
  );
}

function PermissionsTable() {
  const rows: Array<[string, string, "yes" | "gated" | "no"]> = [
    ["Browse the family adventure library on the Fire TV", "Yes", "yes"],
    ["Ask to start an adventure", "Needs your approval", "gated"],
    ["Say an adventure is finished", "Needs your approval", "gated"],
    ["Earn family points", "Only after you confirm", "gated"],
    ["Buy anything through FamilyFlow", "Never", "no"],
    ["Open approvals, settings or activity history", "Never — parents only", "no"],
  ];
  return (
    <section aria-labelledby="perm-h" className="ff-card">
      <h2 id="perm-h" className="text-2xl font-semibold">
        What children can do
      </h2>
      <p className="mt-1 text-ink-soft">
        Permissions apply to the whole household in this version, and parents hold the keys.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left">
          <caption className="sr-only">Child permissions in FamilyFlow</caption>
          <thead>
            <tr className="border-b border-forest-200 text-sm text-ink-soft">
              <th scope="col" className="py-2 pr-4 font-semibold">
                Action
              </th>
              <th scope="col" className="py-2 font-semibold">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-forest-100">
            {rows.map(([action, status, tone]) => (
              <tr key={action}>
                <th scope="row" className="py-3 pr-4 font-normal">
                  {action}
                </th>
                <td className="py-3">
                  <Badge tone={tone === "yes" ? "green" : tone === "gated" ? "amber" : "neutral"}>{status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AddChildCard() {
  const { refresh } = useReadyHousehold();
  const [name, setName] = useState("");
  const [band, setBand] = useState<AgeBand | "">("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const trimmed = name.trim();
  const display = trimmed || "your child";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setResult(null);
    if (!trimmed) return setResult({ tone: "error", text: "Please enter a name." });
    if (!/^[\p{L}\p{N} .'-]+$/u.test(trimmed))
      return setResult({ tone: "error", text: "Names can use letters, numbers, spaces, . ' and -." });
    if (!band) return setResult({ tone: "error", text: "Please choose an age group." });
    if (!acknowledged)
      return setResult({ tone: "error", text: "Please confirm you've shared the visibility notice with your child." });

    setBusy(true);
    try {
      await api.addChild({ displayName: trimmed, ageBand: band, visibilityNoticeAcknowledged: true });
      setResult({ tone: "success", text: `${trimmed} is on the team. Pair the TV below so they can start exploring.` });
      setName("");
      setBand("");
      setAcknowledged(false);
      await refresh();
    } catch (err) {
      setResult({ tone: "error", text: toApiError(err).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="add-h" className="ff-card">
      <h2 id="add-h" className="text-2xl font-semibold">
        Add a child
      </h2>
      <form onSubmit={onSubmit} className="mt-4 space-y-5" noValidate>
        <div>
          <label htmlFor="child-name" className="ff-label">
            First name or nickname
          </label>
          <input
            id="child-name"
            className="ff-input max-w-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoComplete="off"
            aria-describedby="child-name-hint"
            required
          />
          <p id="child-name-hint" className="ff-hint">
            Use a first name or nickname — no surnames needed.
          </p>
        </div>

        <fieldset>
          <legend className="ff-label">Age group</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {AGE_BANDS.map((b) => (
              <label
                key={b}
                className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-forest-300 bg-white p-3 has-[:checked]:border-forest-700 has-[:checked]:bg-forest-100"
              >
                <input
                  type="radio"
                  name="age-band"
                  value={b}
                  checked={band === b}
                  onChange={() => setBand(b)}
                  className="mt-1 size-5 accent-forest-700"
                />
                <span>
                  <span className="block font-semibold">{AGE_BAND_INFO[b].label}</span>
                  <span className="text-sm text-ink-soft">{AGE_BAND_INFO[b].nickname}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="rounded-2xl border border-lantern-400 bg-lantern-50 p-4" role="group" aria-labelledby="notice-h">
          <p id="notice-h" className="flex items-center gap-2 font-semibold text-lantern-900">
            <Icon name="lock" className="size-5" /> Child visibility notice
          </p>
          <p className="mt-2 text-forest-950">
            Parents see FamilyFlow activity only. Please tell {display} this before you continue — here&apos;s
            wording that fits their age:
          </p>
          <blockquote className="mt-2 border-l-4 border-lantern-400 pl-3 font-display text-lg italic text-forest-950">
            {band ? CHILD_NOTICE[band] : "Choose an age group to see the wording for that age."}
          </blockquote>
          <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1 size-5 accent-forest-700"
              aria-describedby="ack-help"
            />
            <span>
              I&apos;ve explained this to {display}, and they know what I can and can&apos;t see.
              <span id="ack-help" className="block text-sm text-ink-soft">
                Required. FamilyFlow records that the notice was acknowledged.
              </span>
            </span>
          </label>
        </div>

        <div aria-live="polite">{result && <Notice tone={result.tone}>{result.text}</Notice>}</div>
        <Button type="submit" variant="primary" busy={busy}>
          Add child profile
        </Button>
      </form>
    </section>
  );
}

function PairingCard() {
  const [code, setCode] = useState<PairingCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!code) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [code]);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const c = await api.createPairingCode();
      setCode(c);
      setNow(Date.now());
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  const remaining = code ? Math.max(0, Math.floor((new Date(code.expiresAt).getTime() - now) / 1000)) : 0;
  const expired = code !== null && remaining === 0;
  const mm = String(Math.floor(remaining / 60)).padStart(1, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <section id="pairing" aria-labelledby="pair-h" className="ff-card scroll-mt-24">
      <div className="flex items-start gap-3">
        <Icon name="tv" className="mt-1 size-7 text-forest-700" />
        <div>
          <h2 id="pair-h" className="text-2xl font-semibold">
            Pair the family Fire TV
          </h2>
          <p className="mt-1 max-w-2xl text-ink-soft">
            Create a one-time 6-digit code, then enter it in the FamilyFlow app on your TV. The code is only
            shown here once and expires quickly.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-5">
        <Button variant="lantern" onClick={generate} busy={busy}>
          {code ? "Make a new code" : "Create pairing code"}
        </Button>
        {code && !expired && (
          <div>
            <p
              className="font-display text-5xl font-semibold tracking-[0.18em] text-forest-900 tabular-nums"
              aria-label={`Pairing code: ${code.code.split("").join(" ")}`}
            >
              {code.code.slice(0, 3)} {code.code.slice(3)}
            </p>
            <p className="text-sm text-ink-soft" role="timer">
              Expires in {mm}:{ss}
            </p>
          </div>
        )}
        {expired && <Notice tone="warn">That code has expired — make a new one.</Notice>}
      </div>
      {error && <Notice tone="error" className="mt-4">{error}</Notice>}
    </section>
  );
}
