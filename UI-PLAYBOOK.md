# Constellation UI playbook — the hard-won conventions

Everything the sibling UIs (hermes-ui, apollo-ui, artemis-ui, demeter-ui) learned, distilled
so olympus-ui starts where they ended up. Written 2026-08-25 by the Codex (GitOps) session.

## Architecture: Next.js standalone + same-origin BFF

- **The browser NEVER talks to a backend service directly.** All data flows through this app's
  own route handlers (`/api/olympus/*`) which call in-cluster services server-side
  (`http://<svc>.<ns>.svc.cluster.local:<port>`). No CORS, no service exposure, no baked
  environment-specific URLs. (artemis-ui started client-direct and had to be rebuilt — the
  backend sent no CORS headers, so the browser blocked it regardless.)
- **`NEXT_PUBLIC_*` vars are inlined at BUILD time** — a chart/runtime env for them is inert.
  Bake `NEXT_PUBLIC_OLYMPUS_API_BASE=/api/olympus` (a RELATIVE path → env-agnostic image) as an
  ARG/ENV in the Dockerfile **builder stage**, and verify it lands in the built browser chunks.
  (zeus-ui shipped this bug: chart values silently ignored, app stuck on fixtures.)
- Runtime (server-side) env is fine for BFF upstreams — that's what chart values set.
- Next.js standalone output, listens :3000, non-root uid 1001, writes nothing at runtime.

## Repo + release

- Public repo (`vezril/<name>`), `development` → PR → `main`; releases are **tags on main**
  (`vX.Y.Z`) driving a `release.yml` that builds/pushes Docker Hub
  **`calvinference/<flatname>`** (e.g. `calvinference/olympusui`) — NOTE the Docker Hub account
  is `calvinference`, NOT the GitHub org name (this has bitten deploys). Add a
  semver-immutability guard + main-ancestry check in release.yml (siblings have them).
- CI on PRs: eslint, tsc, vitest, next build. Keep it green before any release.

## Chart (ships IN this repo: `deploy/charts/<name>`)

- Deployment + ClusterIP Service (80 → 3000) + optional Ingress. `replicaCount: 1` default
  (single-node cluster — 2 is a fossil that buys nothing).
- **Ingress template MUST omit `ingressClassName` when className is empty** —
  `{{- if .Values.ingress.className }}` guard; an empty-string value is RFC-1123-invalid and
  k8s rejects the object outright (bit artemis-ui in two releases). `className: ""` is
  load-bearing on this cluster: no IngressClass resource exists and k3s's Traefik v2.4 silently
  ignores named classes.
- Safe ingress defaults: `enabled: false`, `className: ""`, empty clusterIssuer/tlsSecretName
  (no cert-manager exists — a `codex-ca` default is a footgun).
- Probes on `GET /` (200–399 passes, so a root redirect is fine).
- Reference HelmRelease in `deploy/flux/` mirroring the codex `apps/` shape.

## Deploy reality (the codex side owns this)

- **No Flux** (k3s 1.21; deliberately deferred). Git = source of truth: codex `apps/<name>/`
  holds namespace + GitRepository + HelmRelease; deploys are manual
  `helm upgrade -f <mirrored-values>` from the TAGGED chart — **never bare `--set`** (a
  `--set`-only upgrade replaces all user-supplied values and once silently deleted a live
  ingress).
- Release protocol with the codex session: tag → ping → it verifies the image on Docker Hub,
  bumps the pin in codex, deploys from the tagged chart, verifies (deployed-image check, route,
  BFF round-trip), reports. Claim the release train explicitly to avoid collisions.
- Docs-only releases don't get rolled (pin records what's DEPLOYED, not what's newest).
- Tailnet exposure (when Calvin asks): ingress `host: <name>.tailscale` (+ future
  `<name>.home.experimentalneutron.com`), `className: ""`, reachable via Traefik NodePort
  **:61642** — never test on port 80 (the QNAP host's own nginx answers 200 to any Host and
  lies).

## UX (see UX-STANDARDS.md — binding)

Shared dark-only cyberpunk base · one accent (Olympus: family cyan) · sidebar chrome, mark
top-left, health pill bottom · shadcn/Radix kit · visible sync states + confirm-on-destructive ·
designed empty/error states · status never color-only · god-mark favicon, no wordmarks ·
charts may be hand-rolled where the kit has no equivalent, but must encode confidence/
uncertainty visibly.
