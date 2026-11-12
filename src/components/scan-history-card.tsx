"use client";

import { EmptyState, ErrorState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useResource } from "@/hooks/use-resource";
import {
  formatCount,
  formatDuration,
  formatInstant,
  scanDurationMs,
  type ScanRecord,
} from "@/lib/iris";

/**
 * `GET /scans` — the scan history. `/metrics` can only carry the latest scan, so a run that
 * dropped notes or hit parse errors disappears the moment the next pass overwrites the gauges.
 * This is the same bookkeeping as a list, so a bad run stays visible.
 *
 * The first row here is the same scan the Last scan card reports: iris-service orders both
 * surfaces by `finished_at DESC, id DESC` and tests that they agree.
 */
export function ScanHistoryCard() {
  const { loaded, reload } = useResource<ScanRecord[]>("scans", { refreshMs: 60_000 });

  if (loaded === undefined) {
    return (
      <Card>
        <CardTitle>Scan history</CardTitle>
        <CardContent>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (loaded.state === "error") {
    return <ErrorState what="the scan history" message={loaded.message} onRetry={reload} />;
  }

  // A successful empty array means no scan has COMPLETED — not that scanning is broken. The
  // service excludes in-flight rows, so this is the first-boot state.
  if (loaded.data.length === 0) {
    return (
      <EmptyState
        title="No completed scans"
        hint="iris-service reports only finished scans here. On first boot the initial scan waits for the vault mirror to settle before it runs."
      />
    );
  }

  const withErrors = loaded.data.filter((s) => s.errors > 0).length;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <CardTitle>Scan history</CardTitle>
        {withErrors > 0 ? (
          <Badge variant="destructive" role="status">
            {formatCount(withErrors)} of {formatCount(loaded.data.length)} with errors
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">
            last {formatCount(loaded.data.length)}
          </span>
        )}
      </div>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th scope="col" className="pb-1 pr-4 font-medium">Finished</th>
                <th scope="col" className="pb-1 pr-4 font-medium">Kind</th>
                <th scope="col" className="pb-1 pr-4 text-right font-medium">Took</th>
                <th scope="col" className="pb-1 pr-4 text-right font-medium">Seen</th>
                <th scope="col" className="pb-1 pr-4 text-right font-medium">+ / ~ / −</th>
                <th scope="col" className="pb-1 text-right font-medium">Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loaded.data.map((scan, i) => {
                const took = scanDurationMs(scan);
                return (
                  <tr key={`${scan.finishedAt}-${i}`}>
                    <td className="py-1.5 pr-4 whitespace-nowrap">
                      {formatInstant(new Date(scan.finishedAt))}
                    </td>
                    <td className="py-1.5 pr-4 font-mono text-xs text-muted-foreground">
                      {scan.kind}
                    </td>
                    {/* An unparseable pair reads as unknown, never as an instant scan. */}
                    <td className="py-1.5 pr-4 text-right font-mono text-xs">
                      {took === null ? "—" : formatDuration(took)}
                    </td>
                    <td className="py-1.5 pr-4 text-right font-mono">
                      {formatCount(scan.notesSeen)}
                    </td>
                    <td className="py-1.5 pr-4 text-right font-mono text-xs text-muted-foreground">
                      {formatCount(scan.created)} / {formatCount(scan.changed)} /{" "}
                      {formatCount(scan.deleted)}
                    </td>
                    <td
                      className={`py-1.5 text-right font-mono ${
                        scan.errors > 0 ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {formatCount(scan.errors)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Newest first. <span className="font-mono">+ / ~ / −</span> is created / changed / deleted.
          A non-zero error count means those notes are missing from the index; transient failures
          heal on the next pass, a persistent count does not.
        </p>
      </CardContent>
    </Card>
  );
}
