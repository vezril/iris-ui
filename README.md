# iris-ui — the bridge-health console (NOT a note browser)

The thin console for **Iris**, the constellation ↔ Obsidian vault bridge. It answers one question:
**is the bridge telling the truth right now?** Index vs mirror counts, scan freshness and outcome,
unresolved links, and tag counts — the `/metrics` gauges rendered for a human.

**Reading and editing notes happens in Obsidian, not here.** Obsidian is the primary editor and the
vault is Calvin's source of truth; a note browser in iris-ui would be a worse Obsidian. Same shape
as plutus-ui (bank connections, not budgeting) and echo-ui (subscriptions, not viewing).

**Status:** v1 built (2026-11-12), not yet released or deployed. Design:
`codex/docs/obsidian-bridge.md`. Service: [`iris-service`](https://github.com/vezril/iris-service)
— phase 1 (read-only) and phase 2 (safe writes, off by default) shipped at **v0.3.0**.

## What's on the screen

| Card | Source | Why it's there |
|---|---|---|
| **Index vs vault** | `iris_last_scan_notes_seen` vs `iris_index_notes` | The short-index detector. A positive difference is the silent `WatchService` drop — the failure Iris has actually hit (63 notes indexed of 5,917 on first deploy). This card is why the console exists. |
| **Last scan** | `iris_last_scan_timestamp_seconds` | The one strong liveness signal: it stops advancing iff Iris's own scanning stopped. `Stopped` uses iris-service's own alert threshold, 2× the rescan interval. |
| **Scan history** | `GET /scans` | The last 20 completed scans with duration and created/changed/deleted/errors. `/metrics` can only carry the latest scan, so a bad run would vanish the moment the next pass overwrote the gauges; this keeps it visible. Its first row is the same scan the *Last scan* card reports — iris-service tests that the two surfaces agree. |
| **Unresolved links** | `GET /links/unresolved` | Vault hygiene — each one is a note Calvin meant to write, or a typo in a link. |
| **Tags** | `GET /tags` | The shape of the vault, not its contents. |
| **Newest note in the index** | `iris_vault_newest_note_timestamp_seconds` | Drawn deliberately as a **weak** signal (dashed, muted, labelled): a quiet week looks identical to a wedged sync sidecar, so it must not read as liveness. |

Three distinctions the console is careful never to blur, because blurring them is how a health
screen lies:

- **"Unknown" is never dressed as "healthy."** Before the first scan completes iris-service omits
  the `iris_last_scan_*` gauges entirely rather than publishing zeros, and that absence is carried
  through to a dashed *Unknown* badge — not a reassuring `0`.
- **"The index is unreachable" is never "Iris is down."** `/metrics` answers `200` with
  `iris_index_queryable 0` when Postgres cannot be reached, precisely so the two stay separable;
  the console keeps them separable too.
- **A 404 from a list route is a failure, not an empty list.** (demeter-ui shipped the opposite.)

## ⚠ Exposure: the BFF narrows iris-service, it never widens it

`iris-service`'s API is **unauthenticated and serves the full plaintext of every note**, and it is
on the tailnet. The browser never talks to it — only to this app's own `/api/iris/*` route handler,
which calls the service server-side. That handler is the console's security boundary:

- **A closed allowlist of five GET paths**: `health`, `metrics`, `scans`, `tags`,
  `links/unresolved`. `/notes`, `/notes/{path}`, `/notes/{path}/backlinks` and `/graph` — every
  route that serves note text — are **unreachable through the console**. A bridge-health view needs
  no note bodies.
- **GET only.** No `POST`/`PATCH` is exported, so `POST /admin/reindex` and phase 2's write and
  snapshot routes cannot be reached from here at all. The console cannot alter the service or the
  vault. ("When in doubt, read-only.")
- **No query string is forwarded.** `/scans` accepts an optional `limit`; not forwarding it means
  the console takes the service's default of 20 and the browser cannot push a parameter upstream.
- No credentials exist to leak: the read API has no auth. If one is added, it belongs server-side
  in the BFF, never in the browser bundle.

`tests/bff.test.ts` asserts each of these, and the end-to-end check below confirms them against a
running build rather than only in unit tests.

## Not in v1 (and why)

- **Note content, editing, any vault explorer** — out of scope by design, forever.
- ~~**Scan history.**~~ Shipped — `GET /scans` landed in iris-service, and the card replaced the
  single-row "last scan outcome" tile it supersedes. **Requires iris-service > v0.3.0**; against an
  older build the card shows a designed 404 failure rather than an empty history.
- **A reindex button.** `POST /admin/reindex` exists, but wiring it would mean giving the BFF a
  write method. Not worth it for v1; a rescan is one `curl` away for whoever can already reach the
  service.
- ~~**`release.yml`.**~~ Shipped. Pushing a `vX.Y.Z` tag on `main` verifies the gate, builds the
  image and publishes `calvinference/irisui:X.Y.Z` + `:latest`. **Still requires the
  `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` secrets to be set on this repo** — they are per-repo in
  this org, not shared, and iris-ui has none yet, so the workflow fails closed at its credentials
  check rather than half-publishing.

## Conventions

`UX-STANDARDS.md` + `UI-PLAYBOOK.md` in this folder are the **copied-in binding standards**
(dark-only, one per-god accent). Deploys are the Codex session's. Owner/coordination per
`codex/docs/session-coordination.md`.

**Accent: still PROPOSED, pending the Codex session** — `oklch(0.78 0.16 305)` ≈ `#C98BF5`, a
prismatic lavender keyed to the dominant violet in `codex/docs/brand/iris.png`. Iris has **no row
in the accent table** in `codex/docs/ux-standards.md`, and that table is Codex's tree. See
`docs/relay-codex-iris-ui.md`. The accent is confined to the five CSS variables the standards
specify (`src/app/globals.css`) and is named nowhere else, so ratifying or replacing it is a
five-value edit and no component changes.

## Stack

Next.js 16 + React 19 + Tailwind v4 + shadcn/Radix, same as the sibling consoles. Node 22
(`.nvmrc`). Standalone output; the image listens on :3000 as uid 1001.

## Development

```bash
npm ci
npm run dev        # sets NEXT_PUBLIC_IRIS_API_BASE=/api/iris for you
```

Point the BFF at a service with `IRIS_SERVICE_URL` (see `.env.example`). The gate, which is what CI
runs:

```bash
npm run lint && npm run typecheck && npm test
NEXT_PUBLIC_IRIS_API_BASE=/api/iris npm run build && npm run verify:bundle
```

`verify:bundle` is load-bearing: `NEXT_PUBLIC_*` is inlined at **build** time, so a chart or
runtime value for it is inert. It fails the build if the relative BFF path did not land in the
browser chunks (zeus-ui shipped that bug).

### Verifying the exposure boundary against a real build

Unit tests prove the allowlist's logic; this proves the running server honours it.

```bash
npm run build
IRIS_SERVICE_URL=http://localhost:8099 PORT=3100 node .next/standalone/server.js
# with any stub on :8099 —
curl -s -o /dev/null -w '%{http_code}\n' localhost:3100/api/iris/metrics         # 200
curl -s -o /dev/null -w '%{http_code}\n' localhost:3100/api/iris/notes           # 404, refused here
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3100/api/iris/health  # 405
```

## Deploy

The chart ships in this repo at `deploy/charts/iris-ui`; `deploy/flux/` mirrors the codex
`apps/<name>/` shape for reference. Deploys are the Codex session's, from the **tagged** chart with
mirrored values — never bare `--set`. Ingress is **off by default**; the console shows no note
content, but it fronts a service whose API is unauthenticated, so exposing it is a deliberate act.

Docker Hub account is `calvinference` (`calvinference/irisui`), **not** the GitHub org.

## License

MIT — see [LICENSE.md](LICENSE.md).
