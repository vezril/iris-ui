"use client";

import { useCallback, useEffect, useState } from "react";
import { getJson, getText } from "@/lib/api";
import type { Loaded } from "@/lib/loaded";

export type Resource<T> = {
  /** `undefined` means "loading, nothing to show yet" — callers render a skeleton, never a guess. */
  readonly loaded: Loaded<T> | undefined;
  /** A refresh is in flight while data is already on screen (UX-STANDARDS: syncing is visible). */
  readonly refreshing: boolean;
  /** When the data on screen was fetched, so the view can say "as of ...". */
  readonly loadedAt: Date | undefined;
  readonly reload: () => void;
};

type Options = {
  /** Poll interval; omit for a one-shot load. */
  readonly refreshMs?: number;
};

type Reader<T> = (path: string) => Promise<Loaded<T>>;

type Result<T> = {
  readonly path: string;
  readonly attempt: number;
  readonly loaded: Loaded<T>;
  readonly at: Date;
};

/**
 * `read` must be a stable reference — both call sites below pass a module-level function, which
 * keeps it out of the effect's dependency churn without a ref written during render.
 */
function useFetched<T>(path: string | null, read: Reader<T>, options: Options = {}): Resource<T> {
  const { refreshMs } = options;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result<T>>();
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (path === null) return;
    let cancelled = false;
    void read(path).then((loaded) => {
      if (!cancelled) setResult({ path, attempt, loaded, at: new Date() });
    });
    return () => {
      cancelled = true;
    };
  }, [path, attempt, read]);

  useEffect(() => {
    if (path === null || refreshMs === undefined) return;
    const timer = setInterval(reload, refreshMs);
    return () => clearInterval(timer);
  }, [path, refreshMs, reload]);

  // A result for a different path is stale — show a skeleton rather than the wrong answer. Both
  // flags are DERIVED, so nothing here sets state during a render or synchronously in an effect.
  const current = result !== undefined && result.path === path ? result : undefined;
  return {
    loaded: current?.loaded,
    loadedAt: current?.at,
    refreshing: current !== undefined && current.attempt !== attempt,
    reload,
  };
}

/** Loads one JSON resource through the BFF. */
export function useResource<T>(path: string | null, options?: Options): Resource<T> {
  return useFetched<T>(path, getJson, options);
}

/** Loads `GET /metrics` — Prometheus text — through the BFF. */
export function useTextResource(path: string | null, options?: Options): Resource<string> {
  return useFetched<string>(path, getText, options);
}
