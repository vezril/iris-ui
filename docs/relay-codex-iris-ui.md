# Relay (queued) → the Codex session: Iris's accent row + iris-ui scope confirm

**From:** the Iris session, 2026-11-03. **Delivery: QUEUED** — no Codex session was online
(`ListAgents`: only nx-neptune / claude-toolkit / ssh peers). Nothing here has been landed in
Codex's tree.

```
RELAY → Codex session
Kind: lead
Authorization: none for anything outward-facing. Calvin asked for iris-ui to be created
  ("You create it with `gh`") and for its scope to be checked with Codex ("Check with
  Codex"). That authorizes the REPO and this question; it does not authorize a deploy,
  a chart, or an accent-table edit in your tree.
Ask: (1) accept or replace the proposed Iris accent and add the row to
  docs/ux-standards.md; (2) confirm the iris-ui v1 scope below is the right shape before
  it is built.
Claims:
- [verified ~/Code/Olympus/codex/docs/ux-standards.md §2] The per-service accent table lists
  16 services (dionysus, demeter, hermes, apollo, hephaestus, argus, artemis, hera, poseidon,
  ares, athena, aphrodite, hestia, harpocrates, ariadne, echo). **Iris has no row.** Themis has
  none either.
- [verified codex/docs/brand/iris.png] The mark exists and reads as a winged figure in neon
  whose dominant hue is a luminous violet-lavender, with a rainbow arc (cyan / pink / warm gold)
  as secondary. So a single accent keyed to the mark should be that violet, not a rainbow —
  the standards allow exactly one accent per service.
- [verified ~/Code/Olympus/plutus-ui] A seeded-but-unbuilt UI repo is LICENSE.md + README.md +
  copied-in UX-STANDARDS.md + UI-PLAYBOOK.md and no code. iris-ui now matches that shape.
- [verified iris-service/server/.../MetricsRoutes.scala] iris-service v0.2.0 serves
  GET /metrics with iris_index_notes, iris_last_scan_notes_seen, iris_last_scan_timestamp_seconds,
  iris_last_scan_errors, iris_index_queryable, iris_vault_newest_note_timestamp_seconds.
  The v1 screen below is built from these plus the existing /tags and /links/unresolved.
- [verified codex/apps/iris/iris.yaml:20] The HelmRelease pins calvinference/iris:0.1.1.
  **v0.2.0 is published to Docker Hub but NOT rolled** — the pin bump is yours, and it carries
  the metrics this console needs, so iris-ui is not useful until it lands.
- [unverified] What is actually running in the cluster, and whether the obsidian-sync sidecar
  is still healthy and still in mirror-remote mode. Calvin is away from the home network and
  could not check (2026-11-03).
Delivery: queued
```

## The accent proposal

| Service | Accent | `--primary` (oklch) | ≈ hex | fg on accent |
|---|---|---|---|---|
| iris | prismatic lavender (the rainbow bridge) | `oklch(0.78 0.16 305)` | `#C98BF5` | dark |

Reasoning, so it can be argued with rather than just accepted:

- **Keyed to the mark**, per the standards' own rule that accents sit on the `#06060F` ground the
  marks are keyed to. The mark's dominant hue is the violet in the wings and figure.
- **Distinct from argus** (`oklch(0.6 0.2 300)`) by lightness — 0.78 vs 0.6 — rather than by hue.
  That is the weakest part of the proposal: the hues are 5° apart. If Codex would rather keep hue
  separation, the free bands are roughly 160–180 (teal, clear of hermes green at 145 and family
  cyan at 195) and 310–330 (squeezed between argus 300 and dionysus's magenta accent 340).
- **`fg on accent` is dark** per the standards' L ≥ 0.7 rule.
- A rainbow/iridescent treatment was considered and rejected: the system is explicitly
  one-accent-per-service, and dionysus is the only dual, as the flagship. Iris should not quietly
  become a second exception. The rainbow can live in the mark and in incidental linework.

## iris-ui v1 scope, for confirmation

**The console answers one question: is the bridge telling the truth right now?** Not a note
browser — Obsidian is the primary editor, and a note browser here would be a worse Obsidian.

1. Freshness + liveness: last scan time/age, next rescan, `iris_index_queryable`.
2. **The short-index detector** — `iris_last_scan_notes_seen` vs `iris_index_notes`. This is the
   one that earns the console: it is the mechanized form of the chart runbook's manual "verify
   postgres index count == mirror .md count", and the silent `WatchService` drop it detects is a
   failure Iris has actually hit (63 of 5,917 on first deploy).
3. Scan history with created/changed/deleted/errors.
4. Unresolved links (`GET /links/unresolved`) — genuine vault hygiene.
5. Tag counts (`GET /tags`).

Explicitly out: note content, editing, vault explorer.

**One exposure note for the chart, when iris-ui gets one:** iris-service's API is unauthenticated
and serves the full plaintext of every note, already on the tailnet. A BFF must not widen that —
same-origin only, and a health view needs no note bodies at all.

## Pending-relay entry (paste into `codex/docs/session-coordination.md`)

Codex owns that file; per working agreement #1 it is not edited from here.

```
- **→ Codex session — Iris's accent row + iris-ui v1 scope** (queued 2026-11-03). Iris has no row
  in the ux-standards accent table; the Iris session proposes `oklch(0.78 0.16 305)` (prismatic
  lavender, keyed to the mark) and asks for confirmation of the bridge-health scope before
  iris-ui is built. Full write-up with reasoning and the rejected alternatives in
  `iris-ui/docs/relay-codex-iris-ui.md`. Also flags that **v0.2.0 is published but not rolled** —
  the pin in `apps/iris/iris.yaml` is still 0.1.1, and it carries the metrics iris-ui renders.
```
