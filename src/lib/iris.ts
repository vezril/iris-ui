/**
 * Types mirroring iris-service's JSON, and the pure calculations the console is drawn from.
 * No I/O here.
 *
 * The console answers one question — **is the bridge telling the truth right now?** — so the
 * calculations below are mostly about distinguishing "I know this is fine", "I know this is
 * wrong", and "I do not know", and never letting the third masquerade as the first.
 */

// ---------------------------------------------------------------- wire types

/** `GET /health` at the service root (HealthRoutes). */
export type Health = { status: "UP" | "DOWN"; service: string; version: string };

/** `GET /tags` (TagCount). */
export type TagCount = { tag: string; notes: number };

/** `GET /links/unresolved` (UnresolvedTarget) — a `[[link]]` pointing at no indexed note. */
export type UnresolvedTarget = { rawTarget: string; referencingNotes: number };

// ---------------------------------------------------------------- Prometheus text

/**
 * iris-service hand-rolls format 0.0.4 (`PrometheusText`): per metric a `# HELP` line, a `# TYPE`
 * line, then `name value`. No labels, no histograms.
 */
export type Gauges = Readonly<Record<string, number>>;

export function parseGauges(text: string): Gauges {
  const out: Record<string, number> = {};
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const gap = line.indexOf(" ");
    if (gap <= 0) continue;
    const name = line.slice(0, gap);
    const value = Number(line.slice(gap + 1).trim());
    // A label set would need a different model; iris publishes none, so skip rather than mangle.
    if (name.includes("{") || !Number.isFinite(value)) continue;
    out[name] = value;
  }
  return out;
}

// ---------------------------------------------------------------- the bridge's own account

export type LastScan = {
  readonly finishedAt: Date;
  readonly notesSeen: number;
  readonly created: number;
  readonly changed: number;
  readonly deleted: number;
  readonly errors: number;
};

export type BridgeMetrics = {
  /**
   * When this scrape was read. Every age on screen is relative to THIS, not to the browser's
   * clock at render time — so the figures stay honest between refreshes and the server and client
   * renders agree.
   */
  readonly observedAt: Date;
  /** `iris_index_queryable` — 0 means the metrics endpoint answered but Postgres did not. */
  readonly queryable: boolean;
  /** Notes in the Postgres index. `null` when the read model could not be reached. */
  readonly indexedNotes: number | null;
  /**
   * Newest note mtime in the index. iris-service documents this as a WEAK freshness proxy: a
   * quiet vault looks identical to a wedged sync sidecar. Never present it as liveness.
   */
  readonly newestNote: Date | null;
  /** `null` means NO scan has ever completed — the gauges are absent, not zero. */
  readonly lastScan: LastScan | null;
};

const instant = (seconds: number | undefined): Date | null =>
  seconds === undefined ? null : new Date(seconds * 1000);

/**
 * iris-service omits a gauge whose value is unknown rather than publishing 0 (`time() - 0` on a
 * timestamp reads as half a century of staleness). So absence is meaningful here and is carried
 * through as `null`, never defaulted.
 */
export function readBridgeMetrics(gauges: Gauges, observedAt: Date): BridgeMetrics {
  const finishedAt = instant(gauges["iris_last_scan_timestamp_seconds"]);
  const notesSeen = gauges["iris_last_scan_notes_seen"];
  return {
    observedAt,
    queryable: gauges["iris_index_queryable"] === 1,
    indexedNotes: gauges["iris_index_notes"] ?? null,
    newestNote: instant(gauges["iris_vault_newest_note_timestamp_seconds"]),
    lastScan:
      finishedAt !== null && notesSeen !== undefined
        ? {
            finishedAt,
            notesSeen,
            created: gauges["iris_last_scan_created"] ?? 0,
            changed: gauges["iris_last_scan_changed"] ?? 0,
            deleted: gauges["iris_last_scan_deleted"] ?? 0,
            errors: gauges["iris_last_scan_errors"] ?? 0,
          }
        : null,
  };
}

// ---------------------------------------------------------------- the short-index detector

/**
 * The comparison that earns this console: what the last scan FOUND on disk versus what the index
 * HOLDS. A positive difference is the silent `WatchService` drop — the failure Iris has actually
 * hit in production (63 notes indexed of 5,917 on first deploy). It is the mechanised form of the
 * runbook's manual "verify the Postgres count equals the mirror's .md count".
 */
export type Integrity =
  | { readonly verdict: "aligned"; readonly notes: number }
  | { readonly verdict: "short"; readonly indexed: number; readonly seen: number; readonly missing: number }
  | { readonly verdict: "surplus"; readonly indexed: number; readonly seen: number; readonly extra: number }
  | { readonly verdict: "unknown"; readonly why: string };

export function indexIntegrity(m: BridgeMetrics): Integrity {
  if (!m.queryable) {
    return { verdict: "unknown", why: "The read model did not answer, so the index size is unknown." };
  }
  if (m.indexedNotes === null) {
    return { verdict: "unknown", why: "iris-service published no index count." };
  }
  if (m.lastScan === null) {
    return {
      verdict: "unknown",
      why: "No scan has completed yet, so there is nothing to compare the index against.",
    };
  }
  const { notesSeen } = m.lastScan;
  const difference = notesSeen - m.indexedNotes;
  if (difference > 0) {
    return { verdict: "short", indexed: m.indexedNotes, seen: notesSeen, missing: difference };
  }
  if (difference < 0) {
    return { verdict: "surplus", indexed: m.indexedNotes, seen: notesSeen, extra: -difference };
  }
  return { verdict: "aligned", notes: m.indexedNotes };
}

// ---------------------------------------------------------------- scan freshness

/**
 * Mirrors `rescan-interval = 30m` in iris-service's `application.conf`. The console cannot read
 * the service's configuration, so this is an ASSUMPTION and is labelled as one on screen; if the
 * deployed interval changes, this constant is the single place to follow it.
 */
export const RESCAN_INTERVAL_MS = 30 * 60 * 1000;

export type FreshnessLevel = "fresh" | "late" | "stale" | "never";

export type Freshness = {
  readonly level: FreshnessLevel;
  /** Milliseconds since the last scan finished; `null` when none ever has. */
  readonly ageMs: number | null;
  /** When the next periodic rescan is due, on the assumed interval. */
  readonly nextDueAt: Date | null;
};

/**
 * `stale` uses iris-service's own documented alert threshold — age > 2x the rescan interval means
 * Iris's scanning has stopped, not that the vault is quiet.
 */
export function scanFreshness(
  lastScan: LastScan | null,
  now: Date,
  intervalMs: number = RESCAN_INTERVAL_MS,
): Freshness {
  if (lastScan === null) return { level: "never", ageMs: null, nextDueAt: null };
  // Clock skew between the browser and the service must not read as a scan from the future.
  const ageMs = Math.max(0, now.getTime() - lastScan.finishedAt.getTime());
  const nextDueAt = new Date(lastScan.finishedAt.getTime() + intervalMs);
  const level: FreshnessLevel = ageMs > 2 * intervalMs ? "stale" : ageMs > intervalMs ? "late" : "fresh";
  return { level, ageMs, nextDueAt };
}

// ---------------------------------------------------------------- presentation helpers

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Coarse and honest: "just now", "7m", "3h 12m", "2d 4h". */
export function formatAge(ms: number): string {
  if (ms < MINUTE) return "just now";
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)}m`;
  if (ms < DAY) {
    const hours = Math.floor(ms / HOUR);
    const minutes = Math.floor((ms % HOUR) / MINUTE);
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  }
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  return hours === 0 ? `${days}d` : `${days}d ${hours}h`;
}

/** The vault's own zone, so a timestamp reads the way Calvin's notes do. */
const VAULT_ZONE = "America/Toronto";

export function formatInstant(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VAULT_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(at);
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat("en-CA").format(n);
}
