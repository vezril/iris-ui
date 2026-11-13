import { UnresolvedLinksCard } from "@/components/unresolved-links-card";

export const metadata = { title: "Unresolved links — Iris" };

// Vault hygiene, not bridge health: every `[[link]]` pointing at no indexed note. The dashboard
// shows the most-referenced few; this page exists to show all of them, so `limit={null}`.
export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Unresolved links</h1>
        <p className="text-sm text-muted-foreground">
          Every <span className="font-mono">[[link]]</span> in the vault that points at no indexed
          note — each one is a note that was meant to exist, or a typo in a link. Fix them in
          Obsidian; this is a list, not an editor.
        </p>
      </header>
      <UnresolvedLinksCard limit={null} />
    </div>
  );
}
