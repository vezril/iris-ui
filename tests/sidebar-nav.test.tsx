import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pathname = vi.fn<() => string>();

vi.mock("next/navigation", () => ({ usePathname: () => pathname() }));

const { SidebarNav, NAV } = await import("@/components/sidebar-nav");

beforeEach(() => pathname.mockReset());

describe("SidebarNav", () => {
  it("renders every nav entry as a real link — no disabled placeholders", () => {
    pathname.mockReturnValue("/");
    render(<SidebarNav />);
    for (const item of NAV) {
      expect(screen.getByRole("link", { name: item.label })).toHaveAttribute("href", item.href);
    }
    expect(screen.queryByText("Soon")).not.toBeInTheDocument();
  });

  /** aria-current must follow the real route, or a screen reader is told the wrong page is open. */
  it.each([
    ["/", "Bridge health"],
    ["/links", "Unresolved links"],
    ["/tags", "Tags"],
  ])("marks only the active route at %s", (path, activeLabel) => {
    pathname.mockReturnValue(path);
    render(<SidebarNav />);

    const current = screen.getAllByRole("link").filter((a) => a.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent(activeLabel);
  });

  it("marks nothing current on an unknown route rather than guessing", () => {
    pathname.mockReturnValue("/nope");
    render(<SidebarNav />);
    expect(screen.queryByRole("link", { current: "page" })).not.toBeInTheDocument();
  });
});
