import { CircleCheck, CircleHelp, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { formatCount, indexIntegrity, type BridgeMetrics } from "@/lib/iris";

/**
 * Hand-rolled comparison bar (UX-STANDARDS §5 permits this where the kit has no equivalent).
 *
 * The rule it must obey is that uncertainty is drawn differently from certainty: the shortfall —
 * notes the scan saw on disk but the index does not hold — is drawn as a DASHED outline, never as
 * a second solid fill, so a short index cannot be mistaken for a bigger healthy one at a glance.
 * Every value is also stated in text below, so the bar is decoration on top of the numbers.
 */
function IndexBar({ indexed, seen }: { indexed: number; seen: number }) {
  const scale = Math.max(indexed, seen, 1);
  const width = (n: number) => `${(n / scale) * 100}%`;
  return (
    <div aria-hidden="true" className="flex flex-col gap-1.5 pt-1">
      <div className="h-2.5 w-full rounded-sm bg-muted">
        <div className="h-full rounded-sm bg-family-cyan" style={{ width: width(indexed) }} />
      </div>
      <div className="h-2.5 w-full rounded-sm bg-muted">
        <div
          className="h-full rounded-sm border border-dashed border-family-cyan/70"
          style={{ width: width(seen) }}
        />
      </div>
    </div>
  );
}

const LABEL = {
  aligned: { text: "Aligned", variant: "success", Icon: CircleCheck },
  short: { text: "Short index", variant: "destructive", Icon: TriangleAlert },
  surplus: { text: "Stale rows", variant: "warning", Icon: TriangleAlert },
  unknown: { text: "Unknown", variant: "unknown", Icon: CircleHelp },
} as const;

/**
 * The card that earns this console. `iris_last_scan_notes_seen` vs `iris_index_notes`: a positive
 * difference is the silent WatchService drop, which Iris has actually shipped (63 of 5,917 notes
 * on first deploy). It belongs on a screen, not in an ad-hoc SQL query.
 */
export function IntegrityCard({ metrics }: { metrics: BridgeMetrics }) {
  const integrity = indexIntegrity(metrics);
  const { text, variant, Icon } = LABEL[integrity.verdict];

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <CardTitle>Index vs vault</CardTitle>
        <Badge variant={variant} role="status">
          <Icon aria-hidden="true" className="size-3.5" />
          {text}
        </Badge>
      </div>
      <CardContent>
        {integrity.verdict === "aligned" && (
          <>
            <p className="font-mono text-3xl">{formatCount(integrity.notes)}</p>
            <p className="text-sm text-muted-foreground">
              Notes indexed, and the last scan saw exactly the same number on disk. This is the
              healthy baseline.
            </p>
          </>
        )}

        {integrity.verdict === "short" && (
          <>
            <p className="font-mono text-3xl text-destructive">−{formatCount(integrity.missing)}</p>
            <p className="text-sm">
              The last scan found{" "}
              <span className="font-mono">{formatCount(integrity.seen)}</span> notes on disk but the
              index holds only <span className="font-mono">{formatCount(integrity.indexed)}</span>.
            </p>
            <p className="text-sm text-muted-foreground">
              Notes are missing from the index — the silent watcher drop. A rescan heals it; if it
              returns, the watcher is losing events.
            </p>
            <IndexBar indexed={integrity.indexed} seen={integrity.seen} />
          </>
        )}

        {integrity.verdict === "surplus" && (
          <>
            <p className="font-mono text-3xl text-warning">+{formatCount(integrity.extra)}</p>
            <p className="text-sm">
              The index holds <span className="font-mono">{formatCount(integrity.indexed)}</span>{" "}
              notes but the last scan found only{" "}
              <span className="font-mono">{formatCount(integrity.seen)}</span> on disk.
            </p>
            <p className="text-sm text-muted-foreground">
              Rows for notes that are no longer there. Harmless to the vault, but the index is
              stale — deletions have not been applied.
            </p>
            <IndexBar indexed={integrity.indexed} seen={integrity.seen} />
          </>
        )}

        {integrity.verdict === "unknown" && (
          <>
            <p className="font-mono text-3xl text-muted-foreground">—</p>
            <p className="text-sm text-muted-foreground">{integrity.why}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
