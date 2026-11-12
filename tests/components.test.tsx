import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FreshnessCard, VaultFreshnessCard } from "@/components/freshness-card";
import { HealthPill, healthState } from "@/components/health-pill";
import { IntegrityCard } from "@/components/integrity-card";
import { EmptyState, ErrorState } from "@/components/states";
import { RESCAN_INTERVAL_MS, type BridgeMetrics } from "@/lib/iris";

const observedAt = new Date("2026-11-05T12:00:00Z");

const BASE_SCAN = {
  finishedAt: new Date(observedAt.getTime() - 60_000),
  notesSeen: 100,
  created: 2,
  changed: 5,
  deleted: 1,
  errors: 0,
} as const;

const metrics = (over: Partial<BridgeMetrics> = {}): BridgeMetrics => ({
  observedAt,
  queryable: true,
  indexedNotes: 100,
  newestNote: null,
  lastScan: BASE_SCAN,
  ...over,
});

describe("healthState", () => {
  it("is checking before the first answer", () => {
    expect(healthState(undefined)).toBe("checking");
  });

  it("is live only on an explicit UP", () => {
    expect(healthState({ state: "ok", data: { status: "UP", service: "iris", version: "0.3.0" } })).toBe("live");
  });

  it("is down for an explicit DOWN body", () => {
    expect(
      healthState({ state: "ok", data: { status: "DOWN", service: "iris", version: "0.3.0" } }),
    ).toBe("down");
  });

  it("is down — not 'unknown' — when the service is unreachable", () => {
    expect(healthState({ state: "error", status: 502, message: "nope" })).toBe("down");
  });
});

describe("HealthPill", () => {
  it.each([
    ["live", "Live"],
    ["down", "Down"],
    ["checking", "Checking"],
  ] as const)("names the %s state in words, never colour alone", (state, label) => {
    render(<HealthPill state={state} />);
    expect(screen.getByRole("status")).toHaveTextContent(label);
  });
});

describe("IntegrityCard", () => {
  it("reports an aligned index as the healthy baseline", () => {
    render(<IntegrityCard metrics={metrics()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Aligned");
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("names a short index and the number of missing notes", () => {
    render(
      <IntegrityCard metrics={metrics({ indexedNotes: 63, lastScan: { ...BASE_SCAN, notesSeen: 5917 } })} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Short index");
    expect(screen.getByText(/5,854/)).toBeInTheDocument();
    expect(screen.getByText(/5,917/)).toBeInTheDocument();
    expect(screen.getByText(/63/)).toBeInTheDocument();
  });

  it("reports surplus rows as stale rather than as a failure", () => {
    render(
      <IntegrityCard metrics={metrics({ indexedNotes: 110, lastScan: { ...BASE_SCAN, notesSeen: 100 } })} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Stale rows");
  });

  it("says it does not know, with a reason, when the read model is unreachable", () => {
    render(<IntegrityCard metrics={metrics({ queryable: false, indexedNotes: null })} />);
    expect(screen.getByRole("status")).toHaveTextContent("Unknown");
    expect(screen.getByText(/did not answer/)).toBeInTheDocument();
  });

  it("does not read an empty, never-scanned index as aligned", () => {
    render(<IntegrityCard metrics={metrics({ indexedNotes: 0, lastScan: null })} />);
    expect(screen.getByRole("status")).toHaveTextContent("Unknown");
  });
});

describe("FreshnessCard", () => {
  it("shows the age of a recent scan", () => {
    render(<FreshnessCard metrics={metrics()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Scanning");
    expect(screen.getByText("1m")).toBeInTheDocument();
  });

  it("calls a scan older than twice the interval stopped, not quiet", () => {
    const stale = { ...BASE_SCAN, finishedAt: new Date(observedAt.getTime() - 3 * RESCAN_INTERVAL_MS) };
    render(<FreshnessCard metrics={metrics({ lastScan: stale })} />);
    expect(screen.getByRole("status")).toHaveTextContent("Stopped");
    expect(screen.getByText(/scanning has stopped/)).toBeInTheDocument();
  });

  it("distinguishes never-scanned from a scan of nothing", () => {
    render(<FreshnessCard metrics={metrics({ lastScan: null })} />);
    expect(screen.getByRole("status")).toHaveTextContent("Never scanned");
    expect(screen.getByText(/No scan has completed/)).toBeInTheDocument();
  });

  it("labels the rescan projection as an assumption about the service's config", () => {
    render(<FreshnessCard metrics={metrics()} />);
    expect(screen.getByText(/cannot read the service/)).toBeInTheDocument();
  });
});

describe("VaultFreshnessCard", () => {
  it("marks the vault mtime as a weak signal and says what it cannot tell you", () => {
    render(<VaultFreshnessCard metrics={metrics({ newestNote: new Date(observedAt.getTime() - 86_400_000) })} />);
    expect(screen.getByText("Weak signal")).toBeInTheDocument();
    expect(screen.getByText(/wedged\s+sync sidecar/)).toBeInTheDocument();
  });
});

describe("designed states", () => {
  it("an error says what failed and keeps retry reachable", () => {
    const onRetry = vi.fn();
    render(<ErrorState what="the bridge metrics" message="iris-service could not be reached" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load the bridge metrics");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("an empty state says what is empty", () => {
    render(<EmptyState title="No unresolved links" hint="Every [[link]] resolves." />);
    expect(screen.getByText("No unresolved links")).toBeInTheDocument();
  });
});
