"use client";

import { HealthPill, healthState } from "@/components/health-pill";
import { useResource } from "@/hooks/use-resource";
import type { Health } from "@/lib/iris";

/** Probes `GET /health` (service root) via the BFF, on the same cadence as the console. */
export function SidebarHealth() {
  const { loaded } = useResource<Health>("health", { refreshMs: 30_000 });
  const version = loaded?.state === "ok" ? loaded.data.version : undefined;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">iris-service</span>
        <HealthPill state={healthState(loaded)} />
      </div>
      {version !== undefined && (
        <span className="font-mono text-[11px] text-muted-foreground">v{version}</span>
      )}
    </div>
  );
}
