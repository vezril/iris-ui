import Image from "next/image";
import { SidebarHealth } from "@/components/sidebar-health";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Bridge health", href: "/" as string | null },
  { label: "Unresolved links", href: null },
  { label: "Tags", href: null },
] as const;

/**
 * Left-sidebar chrome: mark top-left, vertical nav, health pill at the bottom. The mark is the
 * only logo — the god marks are deliberately text-free, so there is no wordmark.
 *
 * Nav rows beyond the single page are visibly disabled rather than hidden: v1 puts unresolved
 * links and tags on the one screen, and these become routes when either outgrows a card.
 */
export function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center px-5">
        <Image src="/iris-mark.png" alt="Iris" width={28} height={28} priority className="size-7" />
      </div>
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 px-3">
        {NAV.map((item) =>
          item.href ? (
            <a
              key={item.label}
              href={item.href}
              aria-current="page"
              className="rounded-md bg-sidebar-accent px-3 py-2 text-sm font-medium text-sidebar-accent-foreground"
            >
              {item.label}
            </a>
          ) : (
            <span
              key={item.label}
              aria-disabled="true"
              className={cn(
                "flex cursor-not-allowed items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground opacity-60",
              )}
            >
              {item.label}
              <span className="text-xs">Soon</span>
            </span>
          ),
        )}
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <SidebarHealth />
      </div>
    </aside>
  );
}
