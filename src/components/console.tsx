"use client";

import { DatabaseZap, RefreshCw } from "lucide-react";
import { FreshnessCard, VaultFreshnessCard } from "@/components/freshness-card";
import { IntegrityCard } from "@/components/integrity-card";
import { ScanHistoryCard } from "@/components/scan-history-card";
import { ErrorState } from "@/components/states";
import { TagCountsCard } from "@/components/tag-counts-card";
import { UnresolvedLinksCard } from "@/components/unresolved-links-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTextResource } from "@/hooks/use-resource";
import { formatInstant, parseGauges, readBridgeMetrics } from "@/lib/iris";

const REFRESH_MS = 30_000;

function LoadingCard() {
  return (
    <Card>
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-9 w-24" />
      <Skeleton className="h-4 w-full" />
    </Card>
  );
}

/**
 * The one screen. Everything is read from `GET /metrics` plus two list endpoints, through the
 * same-origin BFF — no note content is fetched, because no part of answering "is the bridge
 * telling the truth?" needs it.
 */
export function Console() {
  const scrape = useTextResource("metrics", { refreshMs: REFRESH_MS });
  const metrics =
    scrape.loaded?.state === "ok" && scrape.loadedAt !== undefined
      ? readBridgeMetrics(parseGauges(scrape.loaded.data), scrape.loadedAt)
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Bridge health</h1>
          <p className="text-sm text-muted-foreground">
            Is Iris telling the truth about the vault right now? Notes are read and edited in
            Obsidian — this console only watches the bridge.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Async truthfulness: a refresh in flight is visible rather than silent. */}
          {scrape.refreshing && (
            <Badge variant="default" role="status" aria-live="polite">
              <RefreshCw aria-hidden="true" className="size-3.5 animate-spin" />
              Refreshing
            </Badge>
          )}
          {scrape.loadedAt !== undefined && !scrape.refreshing && (
            <span className="text-xs text-muted-foreground">
              As of {formatInstant(scrape.loadedAt)}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={scrape.reload}>
            <RefreshCw aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </header>

      {scrape.loaded === undefined && (
        <div className="grid gap-4 lg:grid-cols-2">
          <LoadingCard />
          <LoadingCard />
        </div>
      )}

      {scrape.loaded?.state === "error" && (
        <ErrorState what="the bridge metrics" message={scrape.loaded.message} onRetry={scrape.reload} />
      )}

      {metrics !== undefined && (
        <>
          {/* iris-service answers /metrics with 200 and queryable=0 when it cannot reach Postgres,
              precisely so "iris is down" and "iris cannot read its index" stay distinguishable.
              The console must keep them distinguishable too. */}
          {!metrics.queryable && (
            <Card role="alert" className="border-destructive/60">
              <div className="flex items-start gap-3">
                <DatabaseZap aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-destructive" />
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-foreground">The read model is unreachable</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    iris-service is answering, but it could not reach its Postgres index
                    (<span className="font-mono">iris_index_queryable 0</span>). The vault itself is
                    unaffected — the index is a rebuildable read model — but every count below is
                    unknown until it returns.
                  </p>
                </div>
              </div>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <IntegrityCard metrics={metrics} />
            <FreshnessCard metrics={metrics} />
          </div>

          {/* Replaces a last-scan-outcome card built from the gauges: its single row is the head
              of this list, and iris-service tests that the two surfaces agree on which that is. */}
          <ScanHistoryCard />

          <div className="grid gap-4 lg:grid-cols-2">
            <UnresolvedLinksCard />
            <TagCountsCard />
          </div>

          <VaultFreshnessCard metrics={metrics} />
        </>
      )}
    </div>
  );
}
