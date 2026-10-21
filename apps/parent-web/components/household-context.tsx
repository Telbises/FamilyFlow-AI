"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import * as api from "@/lib/api";
import { ApiError, toApiError } from "@/lib/api";
import type { CurrentHousehold } from "@/lib/types";
import { Button, LoadingBlock, Notice } from "./ui";

type State =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; error: ApiError }
  | { status: "ready"; data: CurrentHousehold };

interface HouseholdContextValue {
  state: State;
  /** Number of items (adventure requests + completions) waiting on the parent. */
  pendingCount: number;
  refresh: () => Promise<void>;
  createHousehold: (timezone: string) => Promise<void>;
}

const Ctx = createContext<HouseholdContextValue | null>(null);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [pendingCount, setPendingCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getCurrentHousehold();
      setState({ status: "ready", data });
      api
        .listApprovals()
        .then((a) => setPendingCount(a.requests.length + a.completions.length))
        .catch(() => setPendingCount(0));
    } catch (e) {
      const err = toApiError(e);
      if (err.status === 404) {
        setState({ status: "missing" });
        setPendingCount(0);
      } else {
        setState({ status: "error", error: err });
      }
    }
  }, []);

  const createHousehold = useCallback(
    async (timezone: string) => {
      await api.createHousehold(timezone);
      await refresh();
    },
    [refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ state, pendingCount, refresh, createHousehold }),
    [state, pendingCount, refresh, createHousehold],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHousehold(): HouseholdContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useHousehold must be used inside <HouseholdProvider>");
  return v;
}

/** Only call from components rendered inside <HouseholdGate>. */
export function useReadyHousehold(): CurrentHousehold & { refresh: () => Promise<void> } {
  const { state, refresh } = useHousehold();
  if (state.status !== "ready") throw new Error("Household is not ready");
  return { ...state.data, refresh };
}

/** Renders children only once a household exists; otherwise shows loading / error / create flows. */
export function HouseholdGate({ children }: { children: ReactNode }) {
  const { state, refresh } = useHousehold();

  if (state.status === "loading") return <LoadingBlock label="Opening your family space…" />;

  if (state.status === "error") {
    return (
      <div className="space-y-3">
        <Notice tone="error" title={state.error.isNetwork ? "FamilyFlow API is unreachable" : "Couldn't load your family space"}>
          <p>{state.error.message}</p>
          {state.error.isNetwork && (
            <p className="mt-1">
              Start it from the repo root with <code className="rounded bg-white/70 px-1.5">pnpm dev:api</code>.
            </p>
          )}
          {state.error.status === 401 && (
            <p className="mt-1">
              The API rejected the local demo token. Make sure it runs with{" "}
              <code className="rounded bg-white/70 px-1.5">ALLOW_LOCAL_DEV_AUTH=true</code>.
            </p>
          )}
        </Notice>
        <Button variant="outline" onClick={() => void refresh()}>
          Try again
        </Button>
      </div>
    );
  }

  if (state.status === "missing") return <CreateHouseholdCard />;

  return <>{children}</>;
}

function CreateHouseholdCard() {
  const { createHousehold } = useHousehold();
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [zones, setZones] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles");
      const supported = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] })
        .supportedValuesOf;
      if (supported) setZones(supported("timeZone"));
    } catch {
      /* keep default */
    }
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createHousehold(timezone.trim());
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="create-household" className="ff-card max-w-2xl">
      <h2 id="create-household" className="text-2xl font-semibold">
        Let&apos;s set up your family space
      </h2>
      <p className="mt-1 text-ink-soft">
        This creates your household and fills the library with a starter set of curated, parent-reviewed
        adventures. Nothing reaches a child until you approve it.
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="tz" className="ff-label">
            Your time zone
          </label>
          <input
            id="tz"
            className="ff-input max-w-sm"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            list="tz-list"
            required
            maxLength={64}
            autoComplete="off"
          />
          <datalist id="tz-list">
            {zones.map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
          <p className="ff-hint">Used so adventure days line up with your week.</p>
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" variant="lantern" busy={busy}>
          Create family space
        </Button>
      </form>
    </section>
  );
}
