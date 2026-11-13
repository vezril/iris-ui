"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const NAV = [
  { label: "Bridge health", href: "/" },
  { label: "Unresolved links", href: "/links" },
  { label: "Tags", href: "/tags" },
] as const;

/**
 * Vertical nav. Client-side only for `usePathname` — `aria-current="page"` has to follow the real
 * route rather than being hard-coded, or a screen reader is told the wrong page is active.
 *
 * Every row is a real route now; there are no disabled "Soon" placeholders left to explain.
 */
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 px-3">
      {NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
