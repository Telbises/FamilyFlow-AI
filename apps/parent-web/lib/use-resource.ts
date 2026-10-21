"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, toApiError } from "./api";

export interface Resource<T> {
  data: T | undefined;
  error: ApiError | undefined;
  loading: boolean;
  /** Re-fetch. `silent` keeps current data on screen instead of showing the loading state. */
  reload: (silent?: boolean) => Promise<void>;
}

/** Tiny fetch-on-mount hook. `fetcher` must be referentially stable (module function or useCallback). */
export function useResource<T>(fetcher: () => Promise<T>): Resource<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<ApiError | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);

  const reload = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const next = await fetcher();
        if (!alive.current) return;
        setData(next);
        setError(undefined);
      } catch (e) {
        if (!alive.current) return;
        setError(toApiError(e));
      } finally {
        if (alive.current) setLoading(false);
      }
    },
    [fetcher],
  );

  useEffect(() => {
    alive.current = true;
    void reload();
    return () => {
      alive.current = false;
    };
  }, [reload]);

  return { data, error, loading, reload };
}
