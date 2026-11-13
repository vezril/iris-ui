import { TagCountsCard } from "@/components/tag-counts-card";

export const metadata = { title: "Tags — Iris" };

// The shape of the vault, never its contents. `limit={null}` so this page shows every tag, where
// the dashboard shows only the busiest.
export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Tags</h1>
        <p className="text-sm text-muted-foreground">
          Every <span className="font-mono">#tag</span> the index holds, and how many notes carry
          it. Bars are proportional to the busiest tag on screen; the numbers carry the truth.
        </p>
      </header>
      <TagCountsCard limit={null} />
    </div>
  );
}
