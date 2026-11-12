import { CircleCheck, CircleHelp, Clock, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  formatAge,
  formatInstant,
  RESCAN_INTERVAL_MS,
  scanFreshness,
  type BridgeMetrics,
} from "@/lib/iris";

const LABEL = {
  fresh: { text: "Scanning", variant: "success", Icon: CircleCheck },
  late: { text: "Overdue", variant: "warning", Icon: Clock },
  stale: { text: "Stopped", variant: "destructive", Icon: TriangleAlert },
  never: { text: "Never scanned", variant: "unknown", Icon: CircleHelp },
} as const;

/**
 * Is Iris still scanning at all? `iris_last_scan_timestamp_seconds` stops advancing if and only if
 * Iris's own scanning has stopped, which makes it the one strong liveness signal here — and the
 * reason `stale` uses iris-service's own alert threshold of 2x the rescan interval.
 */
export function FreshnessCard({ metrics }: { metrics: BridgeMetrics }) {
  const freshness = scanFreshness(metrics.lastScan, metrics.observedAt);
  const { text, variant, Icon } = LABEL[freshness.level];

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <CardTitle>Last scan</CardTitle>
        <Badge variant={variant} role="status">
          <Icon aria-hidden="true" className="size-3.5" />
          {text}
        </Badge>
      </div>
      <CardContent>
        {metrics.lastScan === null || freshness.ageMs === null ? (
          <>
            <p className="font-mono text-3xl text-muted-foreground">—</p>
            <p className="text-sm text-muted-foreground">
              No scan has completed. iris-service omits these gauges entirely until the first one
              finishes, so this is genuinely &ldquo;not yet&rdquo; rather than zero.
            </p>
          </>
        ) : (
          <>
            <p className="font-mono text-3xl">{formatAge(freshness.ageMs)}</p>
            <p className="text-sm text-muted-foreground">
              Finished {formatInstant(metrics.lastScan.finishedAt)}.
            </p>
            {freshness.nextDueAt !== null && (
              <p className="text-sm text-muted-foreground">
                Next rescan due {formatInstant(freshness.nextDueAt)}{" "}
                <span className="text-xs">
                  (assumes the shipped {formatAge(RESCAN_INTERVAL_MS)} interval; the console cannot
                  read the service&rsquo;s config)
                </span>
              </p>
            )}
            {freshness.level === "stale" && (
              <p className="text-sm text-destructive">
                More than twice the rescan interval has passed. That is iris-service&rsquo;s own
                alert threshold: scanning has stopped, rather than the vault being quiet.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * The vault's newest note mtime. iris-service documents this as a WEAK proxy — a quiet week looks
 * identical to a wedged sync sidecar — so it is drawn as a deliberately low-confidence tile
 * (dashed, muted, and labelled) rather than beside the strong signals.
 */
export function VaultFreshnessCard({ metrics }: { metrics: BridgeMetrics }) {
  return (
    <Card className="border-dashed">
      <div className="flex items-start justify-between gap-3">
        <CardTitle>Newest note in the index</CardTitle>
        <Badge variant="unknown">Weak signal</Badge>
      </div>
      <CardContent>
        {metrics.newestNote === null ? (
          <>
            <p className="font-mono text-2xl text-muted-foreground">—</p>
            <p className="text-sm text-muted-foreground">
              No note mtime published. With an empty index there is nothing to date.
            </p>
          </>
        ) : (
          <>
            <p className="font-mono text-2xl text-muted-foreground">
              {formatAge(Math.max(0, metrics.observedAt.getTime() - metrics.newestNote.getTime()))} ago
            </p>
            <p className="text-sm text-muted-foreground">
              {formatInstant(metrics.newestNote)} — cannot distinguish a quiet vault from a wedged
              sync sidecar. Do not read it as liveness.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
