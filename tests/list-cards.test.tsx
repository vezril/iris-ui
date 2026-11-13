import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Loaded } from "@/lib/loaded";

const getJson = vi.fn<(path: string) => Promise<Loaded<unknown>>>();

vi.mock("@/lib/api", () => ({
  getJson: (path: string) => getJson(path),
  getText: () => Promise.resolve({ state: "error", status: null, message: "unused" }),
}));

const { UnresolvedLinksCard } = await import("@/components/unresolved-links-card");
const { TagCountsCard } = await import("@/components/tag-counts-card");

const links = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ rawTarget: `Missing ${i}`, referencingNotes: n - i }));

const tags = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ tag: `tag${i}`, notes: n - i }));

beforeEach(() => getJson.mockReset());

describe("UnresolvedLinksCard", () => {
  it("truncates to the dashboard default and offers the full page", async () => {
    getJson.mockResolvedValue({ state: "ok", data: links(30) });
    render(<UnresolvedLinksCard />);

    expect(await screen.findByText(/Showing the 12 most-referenced of 30/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See all" })).toHaveAttribute("href", "/links");
    expect(screen.getAllByRole("listitem")).toHaveLength(12);
  });

  // Await a LOADED-only element, never the card title: the title also exists in the loading
  // skeleton, so awaiting it resolves against a node React then throws away on the state update,
  // leaving a detached element and a confusing failure.
  it("shows every row with limit={null}, and then has nothing to link to", async () => {
    getJson.mockResolvedValue({ state: "ok", data: links(30) });
    render(<UnresolvedLinksCard limit={null} />);

    expect(await screen.findAllByRole("listitem")).toHaveLength(30);
    expect(screen.queryByText(/Showing the/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "See all" })).not.toBeInTheDocument();
  });

  it("does not offer a full page when nothing is truncated", async () => {
    getJson.mockResolvedValue({ state: "ok", data: links(3) });
    render(<UnresolvedLinksCard />);

    expect(await screen.findAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByRole("link", { name: "See all" })).not.toBeInTheDocument();
  });
});

describe("TagCountsCard", () => {
  it("truncates to the dashboard default and offers the full page", async () => {
    getJson.mockResolvedValue({ state: "ok", data: tags(40) });
    render(<TagCountsCard />);

    expect(await screen.findByText(/Showing the 15 most-used of 40/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See all" })).toHaveAttribute("href", "/tags");
    expect(screen.getAllByRole("listitem")).toHaveLength(15);
  });

  it("shows every row with limit={null}", async () => {
    getJson.mockResolvedValue({ state: "ok", data: tags(40) });
    render(<TagCountsCard limit={null} />);

    expect(await screen.findAllByRole("listitem")).toHaveLength(40);
    expect(screen.queryByText(/Showing the/)).not.toBeInTheDocument();
  });

  /** Still the family rule: an empty list is a real answer, a 404 is a failure. */
  it("treats an empty tag list as empty, not broken", async () => {
    getJson.mockResolvedValue({ state: "ok", data: [] });
    render(<TagCountsCard />);
    expect(await screen.findByText("No tags indexed")).toBeInTheDocument();
  });

  it("renders a 404 as a failure with a retry", async () => {
    getJson.mockResolvedValue({ state: "error", status: 404, message: "no such route" });
    render(<TagCountsCard />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load tag counts");
    expect(screen.queryByText("No tags indexed")).not.toBeInTheDocument();
  });
});
