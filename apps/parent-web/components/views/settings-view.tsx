"use client";

import { useCallback, useState } from "react";
import * as api from "@/lib/api";
import { toApiError } from "@/lib/api";
import { API_BASE_URL, LOCAL_PARENT_TOKEN } from "@/lib/config";
import type { SettingsPatch } from "@/lib/types";
import { useResource } from "@/lib/use-resource";
import { HouseholdGate, useHousehold } from "../household-context";
import { Button, LoadingBlock, Notice, PageHeader, PrivacyNote, Switch } from "../ui";

export function SettingsView() {
  return (
    <>
      <PageHeader eyebrow="Settings & data controls" title="Your family, your data">
        Choose which FamilyFlow features are on, see what is kept and for how long, and take your data with
        you — or delete it.
      </PageHeader>
      <HouseholdGate>
        <Settings />
      </HouseholdGate>
      <LocalAuthCard />
    </>
  );
}

function Settings() {
  const fetchSettings = useCallback(() => api.getSettings(), []);
  const res = useResource(fetchSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function save(patch: SettingsPatch, label: string) {
    setSaving(true);
    setMessage(null);
    try {
      await api.patchSettings(patch);
      await res.reload(true);
      setMessage({ tone: "success", text: `Saved: ${label}.` });
    } catch (e) {
      setMessage({ tone: "error", text: toApiError(e).message });
    } finally {
      setSaving(false);
    }
  }

  if (res.loading && !res.data) return <LoadingBlock label="Loading settings…" />;
  if (res.error && !res.data)
    return (
      <div className="space-y-3">
        <Notice tone="error">{res.error.message}</Notice>
        <Button variant="outline" onClick={() => void res.reload()}>
          Try again
        </Button>
      </div>
    );
  if (!res.data) return null;

  const { settings, privacyNotice, retention } = res.data;
  const f = settings.featureFlags;

  return (
    <div className="space-y-8">
      <section aria-labelledby="priv-h" className="ff-card">
        <h2 id="priv-h" className="text-2xl font-semibold">
          Privacy, in plain words
        </h2>
        <p className="mt-2 text-lg text-forest-950">{privacyNotice}</p>
        <ul className="mt-4 grid gap-2 text-ink-soft sm:grid-cols-2">
          <li>
            <strong className="text-forest-900">You see:</strong> adventures requested, approvals, completions, points, pairing and settings changes.
          </li>
          <li>
            <strong className="text-forest-900">You don&apos;t see:</strong> unrelated Alexa conversations, Amazon shopping or purchase history, other Fire TV apps, or device telemetry.
          </li>
        </ul>
      </section>

      <section aria-labelledby="feat-h" className="ff-card">
        <h2 id="feat-h" className="text-2xl font-semibold">
          Features
        </h2>
        <div className="mt-2 divide-y divide-forest-100" aria-busy={saving}>
          <Switch
            label="Voice requests with Alexa"
            description="Let children ask for adventures through the FamilyFlow Alexa skill."
            checked={f.voice}
            disabled={saving}
            onChange={(v) => save({ featureFlags: { voice: v } }, `Alexa voice requests ${v ? "on" : "off"}`)}
          />
          <Switch
            label="Adventure suggestions"
            description="Generate new adventures. Every suggestion is safety-checked and needs your approval."
            checked={f.ai}
            disabled={saving}
            onChange={(v) => save({ featureFlags: { ai: v } }, `adventure suggestions ${v ? "on" : "off"}`)}
          />
          <Switch
            label="Rewards"
            description="Award family points and unlock shared rewards."
            checked={f.rewards}
            disabled={saving}
            onChange={(v) => save({ featureFlags: { rewards: v } }, `rewards ${v ? "on" : "off"}`)}
          />
          <Switch
            label="Fire TV pairing"
            description="Allow new pairing codes to be created."
            checked={f.devicePairing}
            disabled={saving}
            onChange={(v) => save({ featureFlags: { devicePairing: v } }, `TV pairing ${v ? "on" : "off"}`)}
          />
        </div>
      </section>

      <section aria-labelledby="notif-h" className="ff-card">
        <h2 id="notif-h" className="text-2xl font-semibold">
          Notices &amp; notifications
        </h2>
        <div className="mt-2 divide-y divide-forest-100">
          <Switch
            label="Show children the visibility notice"
            description="Keep children informed about what parents can see in FamilyFlow."
            checked={settings.parentalVisibilityNoticeEnabled}
            disabled={saving}
            onChange={(v) =>
              save({ parentalVisibilityNoticeEnabled: v }, `child visibility notice ${v ? "on" : "off"}`)
            }
          />
          <Switch
            label="In-app updates"
            description="Check for new requests while this dashboard is open."
            checked={settings.notifications.inAppPolling}
            disabled={saving}
            onChange={(v) => save({ notifications: { inAppPolling: v } }, `in-app updates ${v ? "on" : "off"}`)}
          />
          <Switch
            label="Email alerts"
            description="Email me when something needs approval."
            checked={settings.notifications.emailAlerts}
            disabled={saving}
            onChange={(v) => save({ notifications: { emailAlerts: v } }, `email alerts ${v ? "on" : "off"}`)}
          />
        </div>
        <div aria-live="polite" className="mt-3">
          {message && <Notice tone={message.tone}>{message.text}</Notice>}
        </div>
      </section>

      <section aria-labelledby="ret-h" className="ff-card">
        <h2 id="ret-h" className="text-2xl font-semibold">
          How long we keep things
        </h2>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-forest-50 p-4">
            <dt className="text-ink-soft">Activity history</dt>
            <dd className="font-display text-3xl font-semibold text-forest-900">{retention.audit} days</dd>
          </div>
          <div className="rounded-2xl bg-forest-50 p-4">
            <dt className="text-ink-soft">Adventure requests</dt>
            <dd className="font-display text-3xl font-semibold text-forest-900">{retention.requests} days</dd>
          </div>
        </dl>
      </section>

      <DataControls />
      <PrivacyNote />
    </div>
  );
}

function DataControls() {
  const { refresh } = useHousehold();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function onExport() {
    setExporting(true);
    setMessage(null);
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `familyflow-export-${data.exportedAt.slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage({ tone: "success", text: `Exported ${data.itemCount} records to your downloads.` });
    } catch (e) {
      setMessage({ tone: "error", text: toApiError(e).message });
    } finally {
      setExporting(false);
    }
  }

  async function onDelete() {
    setDeleting(true);
    setMessage(null);
    try {
      const r = await api.deleteData();
      setConfirming(false);
      setTyped("");
      setMessage({ tone: "success", text: `${r.message} (${r.deleted} records removed.)` });
      await refresh();
    } catch (e) {
      setMessage({ tone: "error", text: toApiError(e).message });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section aria-labelledby="data-h" className="ff-card">
      <h2 id="data-h" className="text-2xl font-semibold">
        Your data
      </h2>
      <p className="mt-1 text-ink-soft">
        Export everything FamilyFlow holds about your household, or delete it permanently.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="primary" onClick={onExport} busy={exporting}>
          Export my data (JSON)
        </Button>
        {!confirming && (
          <Button variant="outline" onClick={() => setConfirming(true)} className="!border-red-500 !text-red-800">
            Delete all family data…
          </Button>
        )}
      </div>

      {confirming && (
        <div role="group" aria-labelledby="del-h" className="mt-5 rounded-2xl border-2 border-red-400 bg-red-50 p-4">
          <p id="del-h" className="font-semibold text-red-950">
            This permanently deletes your household, children, adventures, points and history.
          </p>
          <p className="mt-1 text-red-950">
            It can&apos;t be undone. You may want to export first. Your sign-in account is separate and isn&apos;t removed.
          </p>
          <label htmlFor="del-confirm" className="ff-label mt-3 !text-red-950">
            Type DELETE to confirm
          </label>
          <input
            id="del-confirm"
            className="ff-input max-w-xs"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <Button variant="danger" onClick={onDelete} busy={deleting} disabled={typed !== "DELETE"}>
              Delete everything
            </Button>
            <Button
              variant="quiet"
              onClick={() => {
                setConfirming(false);
                setTyped("");
              }}
            >
              Keep my data
            </Button>
          </div>
        </div>
      )}

      <div aria-live="polite" className="mt-4">
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
      </div>
    </section>
  );
}

function LocalAuthCard() {
  return (
    <section
      aria-labelledby="auth-h"
      className="mt-8 rounded-3xl border-2 border-dashed border-lantern-500 bg-lantern-50 p-5 sm:p-6"
    >
      <h2 id="auth-h" className="text-2xl font-semibold !text-lantern-900">
        Local demo sign-in — not for production
      </h2>
      <p className="mt-2 text-lantern-900">
        This dashboard is using a development shortcut: every request sends{" "}
        <code className="rounded bg-white/70 px-1.5">Authorization: Bearer {LOCAL_PARENT_TOKEN}</code> to{" "}
        <code className="rounded bg-white/70 px-1.5">{API_BASE_URL}</code>. The local API accepts it only
        when started with <code className="rounded bg-white/70 px-1.5">ALLOW_LOCAL_DEV_AUTH=true</code>. It
        has no password and proves nothing about who you are. Before sharing this app, replace it with
        Cognito sign-in and keep the bypass off.
      </p>
    </section>
  );
}
