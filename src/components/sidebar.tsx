import Image from "next/image";
import Link from "next/link";
import { SidebarHealth } from "@/components/sidebar-health";
import { SidebarNav } from "@/components/sidebar-nav";

/**
 * Left-sidebar chrome: mark top-left, vertical nav, health pill at the bottom. The mark is the
 * only logo — the god marks are deliberately text-free, so there is no wordmark.
 */
export function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center px-5">
        <Link href="/" aria-label="Iris — bridge health">
          <Image src="/iris-mark.png" alt="Iris" width={28} height={28} priority className="size-7" />
        </Link>
      </div>
      <SidebarNav />
      <div className="border-t border-sidebar-border p-4">
        <SidebarHealth />
      </div>
    </aside>
  );
}
