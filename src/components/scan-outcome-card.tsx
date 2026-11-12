import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { formatCount, type BridgeMetrics } from "@/lib/iris";

/**
 * What the last scan DID. iris-service keeps a `scans` table but publishes only the most recent
 * completed row, so this is the last pass and not a history — saying so is the point, because a
 * single row read as a trend would be the console lying.
 *
 * A scan history view needs a service-side endpoint first (`GET /scans`); see README.
 */
export function ScanOutcomeCard({ metrics }: { metrics: BridgeMetrics }) {
  const scan = metrics.lastScan;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <CardTitle>Last scan outcome</CardTitle>
        {scan !== null && scan.errors > 0 && (
          <Badge variant="destructive" role="status">
            {formatCount(scan.errors)} {scan.errors === 1 ? "error" : "errors"}
          </Badge>
        )}
      </div>
      <CardContent>
        {scan === null ? (
          <p className="text-sm text-muted-foreground">
            Nothing to report until a scan completes.
          </p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              {(
                [
                  ["Seen on disk", scan.notesSeen],
                  ["Created", scan.created],
                  ["Changed", scan.changed],
                  ["Deleted", scan.deleted],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-mono text-lg">{formatCount(value)}</dd>
                </div>
              ))}
            </dl>
            {scan.errors > 0 ? (
              <p className="text-sm text-destructive">
                {formatCount(scan.errors)} {scan.errors === 1 ? "file" : "files"} could not be read
                or parsed, so {scan.errors === 1 ? "it is" : "they are"} missing from the index.
                Transient failures heal on the next pass; a persistent count does not.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No read or parse errors. This is the most recent completed scan only, not a history.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
