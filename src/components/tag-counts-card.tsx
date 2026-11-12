"use client";

import { EmptyState, ErrorState } from "@/components/states";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useResource } from "@/hooks/use-resource";
import { formatCount, type TagCount } from "@/lib/iris";

const SHOWN = 15;

/** `GET /tags` — tag names and how many notes carry each. Shape of the vault, not its contents. */
export function TagCountsCard() {
  const { loaded, reload } = useResource<TagCount[]>("tags", { refreshMs: 60_000 });

  if (loaded === undefined) {
    return (
      <Card>
        <CardTitle>Tags</CardTitle>
        <CardContent>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (loaded.state === "error") {
    return <ErrorState what="tag counts" message={loaded.message} onRetry={reload} />;
  }

  if (loaded.data.length === 0) {
    return (
      <EmptyState
        title="No tags indexed"
        hint="Either the vault uses no #tags, or nothing has been indexed yet — check the index count above."
      />
    );
  }

  const sorted = [...loaded.data].sort((a, b) => b.notes - a.notes);
  const shown = sorted.slice(0, SHOWN);
  const busiest = shown[0]?.notes ?? 1;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <CardTitle>Tags</CardTitle>
        <span className="font-mono text-sm">{formatCount(sorted.length)}</span>
      </div>
      <CardContent>
        <ul className="flex flex-col gap-1.5">
          {shown.map((tag) => (
            <li key={tag.tag} className="flex items-center gap-3">
              <span className="w-40 shrink-0 truncate font-mono text-sm" title={tag.tag}>
                #{tag.tag}
              </span>
              {/* Bar is proportional to the busiest tag SHOWN; the number carries the truth. */}
              <span aria-hidden="true" className="h-2 flex-1 rounded-sm bg-muted">
                <span
                  className="block h-full rounded-sm bg-family-cyan/70"
                  style={{ width: `${(tag.notes / busiest) * 100}%` }}
                />
              </span>
              <span className="w-12 shrink-0 text-right font-mono text-xs text-muted-foreground">
                {formatCount(tag.notes)}
              </span>
            </li>
          ))}
        </ul>
        {sorted.length > shown.length && (
          <p className="text-xs text-muted-foreground">
            Showing the {shown.length} most-used of {formatCount(sorted.length)}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
