# iris-ui — the bridge-health console (NOT a note browser)

The thin console for **Iris**, the constellation ↔ Obsidian vault bridge. It answers one question:
**is the bridge telling the truth right now?** Index vs mirror counts, scan history, unresolved
links, and the `/metrics` gauges rendered for a human.

**Reading and editing notes happens in Obsidian, not here.** Obsidian is the primary editor and the
vault is Calvin's source of truth; a note browser in iris-ui would be a worse Obsidian. Same shape
as plutus-ui (bank connections, not budgeting) and echo-ui (subscriptions, not viewing).

**Status:** SEED (2026-11-03). Not built. Design: `codex/docs/obsidian-bridge.md`. Service:
[`iris-service`](https://github.com/vezril/iris-service) — read-only phase 1 shipped at **v0.2.0**;
phase 2 (safe writes) is in progress on `development`.

## Conventions

`UX-STANDARDS.md` + `UI-PLAYBOOK.md` in this folder are the **copied-in binding standards**
(dark-only, one per-god accent). Deploys are the Codex session's. Owner/coordination per
`codex/docs/session-coordination.md`.

**Accent: PROPOSED, pending the Codex session** — `oklch(0.78 0.16 305)` ≈ `#C98BF5`, a prismatic
lavender keyed to the dominant violet in `codex/docs/brand/iris.png`. Iris has **no row in the
accent table** in `codex/docs/ux-standards.md` (16 services listed, Iris absent), and that table is
Codex's tree. See `docs/relay-codex-iris-ui.md`. Do not harden the accent into components before
that lands — keep it in the one CSS variable the standards specify.

## Stack (when built)

Next.js 16 + React 19 + Tailwind v4, same as the sibling consoles. A BFF fronts `iris-service`;
browser same-origin only.

## Scope (v1)

- **Freshness + liveness** — last scan time and age, next rescan, `iris_index_queryable`.
- **The short-index detector** — `iris_last_scan_notes_seen` vs `iris_index_notes`. Their
  difference is the mechanized form of the runbook's manual "index count == mirror .md count"
  check, and it is the failure this project has actually hit. It belongs on screen, not in a query.
- **Scan history** — recent scans with created/changed/deleted/errors, so a bad run is visible.
- **Unresolved links** — already served by `GET /links/unresolved`; a genuine vault-hygiene view.
- **Tag counts** — from `GET /tags`.

**Not in v1:** note content, editing, or anything resembling a vault explorer.

## ⚠ A note on exposure

`iris-service`'s API is **unauthenticated and serves the full plaintext of every note**, and it is
on the tailnet (`iris.tailscale`). A BFF here must not widen that: same-origin only, no proxying of
note bodies to the browser beyond what a health view needs — which is none. Phase 2's write
endpoint requires a per-service API key independently of any ingress auth.

## License

MIT — see [LICENSE.md](LICENSE.md).
