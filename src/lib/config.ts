/**
 * NEXT_PUBLIC_* is inlined into the browser bundle at BUILD time, so a runtime/chart value for it
 * is inert. The Dockerfile bakes the relative BFF path in the builder stage. There is deliberately
 * NO fallback here: a missing value must fail loudly, not quietly work (zeus-ui shipped that bug).
 *
 * The reference must stay the literal `process.env.NEXT_PUBLIC_IRIS_API_BASE` — Next only inlines
 * that exact form.
 */
export function apiBase(): string {
  const base = process.env.NEXT_PUBLIC_IRIS_API_BASE;
  if (!base) {
    throw new Error(
      "NEXT_PUBLIC_IRIS_API_BASE was not set at build time (expected the relative BFF path); the browser bundle cannot reach the BFF.",
    );
  }
  return base.replace(/\/+$/, "");
}
