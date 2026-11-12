import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Loaded } from "@/lib/loaded";

const getJson = vi.fn<(path: string) => Promise<Loaded<unknown>>>();

// The card reaches the BFF through lib/api; stubbing that module is the seam that lets the
// rendering logic be tested without a server.
vi.mock("@/lib/api", () => ({
  getJson: (path: string) => getJson(path),
  getText: () => Promise.resolve({ state: "error", status: null, message: "unused" }),
}));

const { ScanHistoryCard } = await import("@/components/scan-history-card");

const scan = (over: Record<string, unknown> = {}) => ({
  kind: "full",
  startedAt: "2026-11-05T12:00:00Z",
  finishedAt: "2026-11-05T12:01:34Z",
  notesSeen: 5917,
  created: 0,
  changed: 2,
  deleted: 0,
  errors: 0,
  ...over,
});

beforeEach(() => getJson.mockReset());

describe("ScanHistoryCard", () => {
  it("asks the BFF for the scan history", async () => {
    getJson.mockResolvedValue({ state: "ok", data: [scan()] });
    render(<ScanHistoryCard />);
    await screen.findByText("Scan history");
    expect(getJson).toHaveBeenCalledWith("scans");
  });

  it("renders a row per scan with its duration and counts", async () => {
    getJson.mockResolvedValue({
      state: "ok",
      data: [scan({ kind: "watch" }), scan({ errors: 3 })],
    });
    render(<ScanHistoryCard />);

    expect(await screen.findByText("watch")).toBeInTheDocument();
    expect(screen.getByText("full")).toBeInTheDocument();
    // startedAt -> finishedAt is 94s, which only the two-timestamp payload can give us.
    expect(screen.getAllByText("1m")).toHaveLength(2);
    expect(screen.getAllByText("5,917")).toHaveLength(2);
  });

  it("counts the runs with errors rather than burying them in the table", async () => {
    getJson.mockResolvedValue({ state: "ok", data: [scan(), scan({ errors: 3 })] });
    render(<ScanHistoryCard />);
    expect(await screen.findByRole("status")).toHaveTextContent("1 of 2 with errors");
  });

  it("says 'last N' when every run was clean", async () => {
    getJson.mockResolvedValue({ state: "ok", data: [scan(), scan()] });
    render(<ScanHistoryCard />);
    expect(await screen.findByText("last 2")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows an unparseable duration as unknown, never as an instant scan", async () => {
    getJson.mockResolvedValue({ state: "ok", data: [scan({ startedAt: "nope" })] });
    render(<ScanHistoryCard />);
    await screen.findByText("Scan history");
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  /** A successful empty array is first-boot, not breakage — and it is not a 404 either. */
  it("treats an empty history as 'none completed yet'", async () => {
    getJson.mockResolvedValue({ state: "ok", data: [] });
    render(<ScanHistoryCard />);
    expect(await screen.findByText("No completed scans")).toBeInTheDocument();
  });

  it("renders a 404 as a failure with a retry, not as an empty history", async () => {
    getJson.mockResolvedValue({
      state: "error",
      status: 404,
      message: "iris-service has no such route (404). This is a failure, not an empty result.",
    });
    render(<ScanHistoryCard />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load the scan history");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByText("No completed scans")).not.toBeInTheDocument();
  });

  it("shows a skeleton before the first answer", async () => {
    let answer: (loaded: Loaded<unknown>) => void = () => {};
    getJson.mockReturnValue(
      new Promise<Loaded<unknown>>((resolve) => {
        answer = resolve;
      }),
    );
    render(<ScanHistoryCard />);

    expect(screen.getByText("Scan history")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    // Resolve before the test ends: a promise left pending outlives cleanup and stalls the run.
    answer({ state: "ok", data: [] });
    await screen.findByText("No completed scans");
  });
});
