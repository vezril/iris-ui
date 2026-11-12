import { describe, expect, it } from "vitest";
import {
  formatAge,
  formatDuration,
  indexIntegrity,
  parseGauges,
  readBridgeMetrics,
  RESCAN_INTERVAL_MS,
  scanDurationMs,
  scanFreshness,
  type BridgeMetrics,
} from "@/lib/iris";

/** Exactly the shape iris-service's `PrometheusText.render` emits: HELP, TYPE, then the sample. */
const SCRAPE = `# HELP iris_index_queryable 1 if the read model answered this scrape, 0 if it could not be reached.
# TYPE iris_index_queryable gauge
iris_index_queryable 1
# HELP iris_index_notes Notes currently in the Postgres index.
# TYPE iris_index_notes gauge
iris_index_notes 5917
# HELP iris_vault_newest_note_timestamp_seconds Newest note mtime in the index, unix seconds. WEAK freshness proxy — a quiet vault looks identical to a wedged sidecar. Do not alert on this alone.
# TYPE iris_vault_newest_note_timestamp_seconds gauge
iris_vault_newest_note_timestamp_seconds 1762300000
# HELP iris_last_scan_timestamp_seconds Completion of the last finished scan, unix seconds.
# TYPE iris_last_scan_timestamp_seconds gauge
iris_last_scan_timestamp_seconds 1762350000
# HELP iris_last_scan_notes_seen Markdown files the last scan found on disk.
# TYPE iris_last_scan_notes_seen gauge
iris_last_scan_notes_seen 5917
# HELP iris_last_scan_created Notes added by the last scan.
# TYPE iris_last_scan_created gauge
iris_last_scan_created 3
# HELP iris_last_scan_changed Notes updated by the last scan.
# TYPE iris_last_scan_changed gauge
iris_last_scan_changed 12
# HELP iris_last_scan_deleted Notes removed by the last scan.
# TYPE iris_last_scan_deleted gauge
iris_last_scan_deleted 1
# HELP iris_last_scan_errors Files the last scan could not read or parse.
# TYPE iris_last_scan_errors gauge
iris_last_scan_errors 0
`;

/** What the endpoint returns when it answered but Postgres did not. */
const UNQUERYABLE = `# HELP iris_index_queryable 1 if the read model answered this scrape, 0 if it could not be reached.
# TYPE iris_index_queryable gauge
iris_index_queryable 0
`;

const observedAt = new Date("2026-11-05T12:00:00Z");

describe("parseGauges", () => {
  it("reads the samples and ignores HELP/TYPE comments", () => {
    const gauges = parseGauges(SCRAPE);
    expect(gauges["iris_index_notes"]).toBe(5917);
    expect(gauges["iris_last_scan_errors"]).toBe(0);
    expect(Object.keys(gauges)).toHaveLength(9);
  });

  it("returns nothing for an empty body rather than inventing zeros", () => {
    expect(parseGauges("")).toEqual({});
  });

  it("skips malformed lines and labelled samples instead of mangling them", () => {
    const gauges = parseGauges(
      "iris_ok 1\nbroken_line\niris_bad not_a_number\niris_labelled{a=\"b\"} 3\n",
    );
    expect(gauges).toEqual({ iris_ok: 1 });
  });

  it("handles a float value", () => {
    expect(parseGauges("iris_x 1762350000.5\n")["iris_x"]).toBe(1762350000.5);
  });
});

describe("readBridgeMetrics", () => {
  it("reads a healthy scrape", () => {
    const m = readBridgeMetrics(parseGauges(SCRAPE), observedAt);
    expect(m.queryable).toBe(true);
    expect(m.indexedNotes).toBe(5917);
    expect(m.lastScan?.notesSeen).toBe(5917);
    expect(m.lastScan?.created).toBe(3);
    expect(m.lastScan?.finishedAt.getTime()).toBe(1762350000 * 1000);
    expect(m.newestNote?.getTime()).toBe(1762300000 * 1000);
    expect(m.observedAt).toBe(observedAt);
  });

  /**
   * The rule that keeps the console honest: iris-service OMITS a gauge it does not know rather
   * than publishing 0, so absence must stay absence all the way to the screen.
   */
  it("reports an unqueryable read model without inventing an index size", () => {
    const m = readBridgeMetrics(parseGauges(UNQUERYABLE), observedAt);
    expect(m.queryable).toBe(false);
    expect(m.indexedNotes).toBeNull();
    expect(m.lastScan).toBeNull();
    expect(m.newestNote).toBeNull();
  });

  it("treats absent last-scan gauges as never-scanned, not as a scan of zero notes", () => {
    const m = readBridgeMetrics(
      parseGauges("iris_index_queryable 1\niris_index_notes 0\n"),
      observedAt,
    );
    expect(m.indexedNotes).toBe(0);
    expect(m.lastScan).toBeNull();
  });
});

const BASE_SCAN = {
  finishedAt: new Date(observedAt.getTime() - 60_000),
  notesSeen: 100,
  created: 0,
  changed: 0,
  deleted: 0,
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

describe("indexIntegrity — the short-index detector", () => {
  it("is aligned when the index holds what the scan saw", () => {
    expect(indexIntegrity(metrics())).toEqual({ verdict: "aligned", notes: 100 });
  });

  it("detects a short index — the silent watcher drop", () => {
    const m = metrics({ indexedNotes: 63, lastScan: { ...BASE_SCAN, notesSeen: 5917 } });
    expect(indexIntegrity(m)).toEqual({ verdict: "short", indexed: 63, seen: 5917, missing: 5854 });
  });

  it("detects surplus rows when deletions have not been applied", () => {
    const m = metrics({ indexedNotes: 110, lastScan: { ...BASE_SCAN, notesSeen: 100 } });
    expect(indexIntegrity(m)).toEqual({ verdict: "surplus", indexed: 110, seen: 100, extra: 10 });
  });

  it.each([
    ["the read model is unreachable", metrics({ queryable: false, indexedNotes: null })],
    ["no scan has completed", metrics({ lastScan: null })],
    ["no index count was published", metrics({ indexedNotes: null })],
  ])("says it does not know when %s", (_why, m) => {
    expect(indexIntegrity(m).verdict).toBe("unknown");
  });

  it("never reports aligned on a zero-vs-zero unknown", () => {
    // An empty index with no scan must not read as "0 == 0, all good".
    expect(indexIntegrity(metrics({ indexedNotes: 0, lastScan: null })).verdict).toBe("unknown");
  });
});

describe("scanFreshness", () => {
  const scan = (agoMs: number) => ({
    finishedAt: new Date(observedAt.getTime() - agoMs),
    notesSeen: 1,
    created: 0,
    changed: 0,
    deleted: 0,
    errors: 0,
  });

  it("is `never` with no completed scan", () => {
    expect(scanFreshness(null, observedAt)).toEqual({ level: "never", ageMs: null, nextDueAt: null });
  });

  it("is fresh within the rescan interval", () => {
    expect(scanFreshness(scan(5 * 60_000), observedAt).level).toBe("fresh");
  });

  it("is late past one interval", () => {
    expect(scanFreshness(scan(RESCAN_INTERVAL_MS + 60_000), observedAt).level).toBe("late");
  });

  it("is stale past twice the interval — iris-service's own alert threshold", () => {
    expect(scanFreshness(scan(2 * RESCAN_INTERVAL_MS + 60_000), observedAt).level).toBe("stale");
  });

  it("does not read clock skew as a scan from the future", () => {
    expect(scanFreshness(scan(-60_000), observedAt).ageMs).toBe(0);
  });

  it("projects the next rescan from the last completion", () => {
    const freshness = scanFreshness(scan(0), observedAt);
    expect(freshness.nextDueAt?.getTime()).toBe(observedAt.getTime() + RESCAN_INTERVAL_MS);
  });
});

describe("scanDurationMs", () => {
  const scan = (startedAt: string, finishedAt: string) => ({
    kind: "full",
    startedAt,
    finishedAt,
    notesSeen: 1,
    created: 0,
    changed: 0,
    deleted: 0,
    errors: 0,
  });

  it("measures the gap the service's two timestamps describe", () => {
    expect(scanDurationMs(scan("2026-11-05T12:00:00Z", "2026-11-05T12:01:34Z"))).toBe(94_000);
  });

  it("is unknown rather than zero when the timestamps are unparseable", () => {
    expect(scanDurationMs(scan("not a date", "2026-11-05T12:00:00Z"))).toBeNull();
  });

  /** A negative duration would mean the service disagreed with itself; don't tidy that away. */
  it("is unknown rather than negative when finished precedes started", () => {
    expect(scanDurationMs(scan("2026-11-05T12:01:00Z", "2026-11-05T12:00:00Z"))).toBeNull();
  });
});

describe("formatDuration", () => {
  it.each([
    [250, "250ms"],
    [1_500, "1.5s"],
    [9_900, "9.9s"],
    [45_000, "45s"],
    [94_000, "1m"],
    [3 * 3_600_000, "3h"],
  ])("formats %ims as %s", (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

describe("formatAge", () => {
  it.each([
    [30_000, "just now"],
    [7 * 60_000, "7m"],
    [3 * 3_600_000, "3h"],
    [3 * 3_600_000 + 12 * 60_000, "3h 12m"],
    [2 * 86_400_000, "2d"],
    [2 * 86_400_000 + 4 * 3_600_000, "2d 4h"],
  ])("formats %ims as %s", (ms, expected) => {
    expect(formatAge(ms)).toBe(expected);
  });
});
