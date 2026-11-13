"use client";

import { EmptyState, ErrorState } from "@/components/states";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useResource } from "@/hooks/use-resource";
import { formatCount, type UnresolvedTarget } from "@/lib/iris";

const DEFAULT_SHOWN = 12;

/**
 * `GET /links/unresolved` — `[[links]]` that point at no indexed note. Genuine vault hygiene: each
 * one is either a note Calvin meant to write or a typo in a link.
 *
 * Note what is NOT here: the link TARGET text only, never note bodies. The target is already a
 * link Calvin typed, and the console needs nothing more.
 *
 * @param limit
 *   how many rows to show; `null` shows every one. The dashboard passes the default so the health
 *   view stays glanceable, and `/links` passes `null` because that page exists to show the lot.
 */
export function UnresolvedLinksCard({ limit = DEFAULT_SHOWN }: { limit?: number | null }) {
  const { loaded, reload } = useResource<UnresolvedTarget[]>("links/unresolved", {
    refreshMs: 60_000,
  });

  if (loaded === undefined) {
    return (
      <Card>
        <CardTitle>Unresolved links</CardTitle>
        <CardContent>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (loaded.state === "error") {
    return <ErrorState what="unresolved links" message={loaded.message} onRetry={reload} />;
  }

  // An empty array is a real, successful answer here — and good news, unlike a 404.
  if (loaded.data.length === 0) {
    return (
      <EmptyState
        title="No unresolved links"
        hint="Every [[link]] in the vault points at a note the index holds."
      />
    );
  }

  const sorted = [...loaded.data].sort((a, b) => b.referencingNotes - a.referencingNotes);
  const shown = limit === null ? sorted : sorted.slice(0, limit);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <CardTitle>Unresolved links</CardTitle>
        <span className="font-mono text-sm">{formatCount(sorted.length)}</span>
      </div>
      <CardContent>
        <ul className="flex flex-col divide-y divide-border">
          {shown.map((target) => (
            <li key={target.rawTarget} className="flex items-center justify-between gap-4 py-1.5">
              <span className="truncate font-mono text-sm" title={target.rawTarget}>
                {target.rawTarget}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatCount(target.referencingNotes)}{" "}
                {target.referencingNotes === 1 ? "note" : "notes"}
              </span>
            </li>
          ))}
        </ul>
        {sorted.length > shown.length && (
          <p className="text-xs text-muted-foreground">
            Showing the {shown.length} most-referenced of {formatCount(sorted.length)}.{" "}
            <a href="/links" className="underline hover:text-foreground">
              See all
            </a>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
