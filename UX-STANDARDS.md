# UX / Brand standards — the constellation frontends

**Scope:** every service frontend (per-service UIs: artemis-ui, hermes-ui, apollo-ui, the
dionysus family, future consoles). **Reference implementation:** `dionysus-planner`
(`app/globals.css`) — when in doubt, copy it. **Companion:** the god marks + accent table in
`dionysus-planner/docs/brand-prompts.md` (mirrored PNGs in `codex/docs/brand/`).

The system in one sentence: **one shared cyberpunk base, one god-accent per service** — cyan is
the family's linework identity; the god's accent is the service's signature.

## 1. The shared base (dark-only)

No light mode exists, anywhere. Don't build one. The ground is near-black violet; everything
at hue 280 except the identity colors.

| Token | Value | Notes |
|---|---|---|
| `--background` | `oklch(0.13 0.02 280)` | ≈ `#06060F` — the ground the marks are keyed to |
| `--foreground` | `oklch(0.93 0.01 280)` | |
| `--card` / `--popover` | `oklch(0.17 0.03 280)` | surfaces one step up |
| `--secondary` | `oklch(0.22 0.04 280)` | |
| `--muted` | `oklch(0.2 0.03 280)` | fg `oklch(0.65 0.03 280)` |
| `--border` / `--input` | `oklch(0.28 0.04 280)` | |
| `--destructive` | `oklch(0.62 0.24 25)` | shared — never a god accent |
| `--radius` | `0.15rem` | sharp corners; scale via the dionysus multipliers |
| family cyan | `oklch(0.85 0.2 195)` | ≈ `#00F4F6` — linework/base identity |

**Status colors are shared, not per-service**: success/ready `oklch(0.8 0.25 145)`, warning/near
`oklch(0.8 0.16 85)`, destructive as above. A service's accent never repurposes them.

**Neon focus ring** (also the keyboard-focus indicator — copy verbatim):

```css
:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
  box-shadow: 0 0 10px color-mix(in oklab, var(--ring) 55%, transparent);
}
```

**Typography/spacing** per dionysus: Geist Sans (`--font-sans`) + Geist Mono, headings = sans.
No new fonts without a very good reason.

## 2. Per-service accents (the god's signature)

The accent drives `--primary`, `--ring`, highlights, and the logo echo. Everything else stays
the shared base. oklch is canonical; hex is approximate. All values sit legibly on the
`#06060F` ground.

| Service | Accent | `--primary` (oklch) | ≈ hex | fg on accent |
|---|---|---|---|---|
| dionysus | cyan **+ magenta** (dual — the flagship) | `oklch(0.85 0.2 195)` + `--accent: oklch(0.7 0.28 340)` | `#00F4F6` / `#FF30D3` | dark |
| demeter | amber | `oklch(0.8 0.16 85)` | `#EDB417` | dark |
| hermes | green | `oklch(0.8 0.25 145)` | `#0AE442` | dark |
| apollo | warm gold-white | `oklch(0.9 0.12 95)` | `#F2DE9B` | dark |
| hephaestus | molten orange-red | `oklch(0.7 0.22 35)` | `#F0713D` | dark |
| argus | violet | `oklch(0.6 0.2 300)` | `#9A5CD0` | **light** |
| artemis | silver moonlight | `oklch(0.87 0.03 260)` | `#D0D3DE` | dark |
| hera | imperial rose-gold | `oklch(0.78 0.1 25)` | `#E8A99B` | dark |
| poseidon | deep sapphire | `oklch(0.65 0.19 255)` | `#3D7BE0` | **light** |
| ares | blood crimson | `oklch(0.6 0.23 20)` | `#D33A3F` | **light** |
| athena | steel-bronze + olive | `oklch(0.75 0.1 75)` + olive `oklch(0.7 0.13 130)` | `#CBA96A` / `#7DB06A` | dark |
| aphrodite | soft coral-pink | `oklch(0.78 0.15 15)` | `#F5A099` | dark |
| hestia | ember gold | `oklch(0.78 0.15 65)` | `#EDAE4E` | dark |
| harpocrates | muted indigo | `oklch(0.58 0.18 278)` | `#5E5ACB` | **light** |
| ariadne | spun gold (the golden thread) | `oklch(0.83 0.13 91)` | `#E7C455` | dark |
| echo | signal azure (a voice carried on the air) | `oklch(0.78 0.14 225)` | `#40B0E4` | dark |

**fg on accent**: accents with L ≥ 0.7 take the dark foreground `oklch(0.15 0.02 280)`;
dimmer accents (argus, poseidon, ares) take `oklch(0.97 0.01 280)` instead. Never mid-grey.

## 3. Wiring a service (the recipe)

1. Copy dionysus-planner's `app/globals.css` `:root` block wholesale (dark-only, radius, focus
   ring, status + chart tokens, sidebar block).
2. Override exactly these with the god accent: `--primary`, `--primary-foreground` (per the fg
   column), `--ring`, `--sidebar-primary`, `--sidebar-ring`. Dual-accent services (dionysus,
   athena) also set `--accent`/`--accent-foreground`; single-accent services keep the base
   `--accent` or reuse their primary — don't invent a second color.
3. Keep cyan present: linework, the logo mark, charts (`--chart-1` stays family cyan). The god
   accent is the *signature*, not a re-theme — if a screen reads as "all accent", it's wrong.
4. Logo: the keyed mark (`docs/brand/<god>.png`) top-left in the sidebar/nav + optionally a
   faint centered watermark behind the main view at very low opacity (hermes-ui convention).
   The accent in the mark and `--primary` must be the same value — that's the "echo".
5. Status/destructive/muted/border: leave them alone. They're how the family reads as one
   system across the family of accents.

## 4. Don'ts

- No light mode. No per-service radius, fonts, or spacing scales.
- No accent for destructive actions (shared red only) or status (shared green/amber only).
- Don't ship an accent that fails on `#06060F` — if you must brighten, raise L, not chroma.
- Don't bake UI colors into images other than the god mark itself.

## 5. Component & interaction conventions (consoles)

Kit: **shadcn/ui + Radix primitives, cva/clsx/tailwind-merge**, Tailwind v4 — as dionysus-planner
uses. Don't hand-roll what the kit has.

- **Chrome**: left sidebar — service mark top-left, vertical nav, health pill at the bottom;
  optional faint mark watermark behind the main view (very low opacity). No top-nav layouts.
- **Async truthfulness** (a long-standing Calvin preference, set down in the earliest console designs):
  syncing/pending state is **visible** (a "syncing…" badge/spinner on optimistic updates), and
  **destructive actions get a confirm dialog** — no silent deletes.
- **Loading**: skeletons for first paint, not layout-shifting spinners.
- **Empty/error states**: designed, not blank — say what's empty and what action creates data;
  errors state what failed and keep the retry visible.
- **Status is never color-only**: pair every status color with text or an icon (the health pill
  says "Live"/"Down", not just green/red).
- **Charts — visual honesty over kit purity**: hand-rolled SVG is compliant where the kit has
  no equivalent ("don't hand-roll what the kit has" targets dialogs/menus/inputs, not bespoke
  data viz). Rule that matters: **encode data confidence/uncertainty visibly** — a low-confidence
  point must not draw identically to a high-confidence one (e.g. hollow/dashed vs solid, per
  demeter-ui's price chart, the reference for this). `--chart-1` stays family cyan regardless.
- **Never conflate "missing" with "empty"**: a 404 from a LIST endpoint means the route is
  gone, not that there's nothing — rendering it as "No items yet" is the visual-truthfulness
  failure in API costume (demeter-ui shipped and fixed exactly this). Treat 404-means-empty as
  per-endpoint opt-in; list routes never opt in.
- **Verifying the theme in a BUILT bundle**: Tailwind v4/Lightning CSS compiles `oklch()` to
  hex + a `lab()` fallback — grepping shipped CSS for "oklch" finds nothing and values land a
  shade off the stated hex (gamut mapping). That's correct output, not a failed theme; verify
  against the compiled hex approximations.
- **Favicon/logo**: the favicon is the service's god mark; the mark is the only logo (no text
  wordmarks — the marks are deliberately text-free). Marks face **right** and are delivered on a
  **transparent** background (convention 2026-08-26 — supersedes the older `#06060F`-baked marks;
  full brand + generation convention in `docs/brand/README.md`).
