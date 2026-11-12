/**
 * The same-origin BFF's logic, kept free of Next so it is testable without a server.
 *
 * The browser only ever calls `/api/iris/*`; this module turns such a request into a server-side
 * call to iris-service. It is the console's security boundary, and the rules are load-bearing:
 *
 *  - **A closed allowlist of five GET paths.** iris-service's API is unauthenticated and serves
 *    the full plaintext of every note (`GET /notes`, `/notes/{path}`, `/notes/{path}/backlinks`,
 *    `/graph`). None of them is reachable through here, because a bridge-health console needs no
 *    note bodies at all. The BFF must not widen the service's exposure — it narrows it.
 *  - **GET only.** `POST /admin/reindex` and phase 2's `PATCH`/snapshot write routes are
 *    unreachable by construction, so this console cannot alter the service or the vault. ("When
 *    in doubt, read-only" — iris-service AGENTS.md.)
 *  - **No query string is forwarded.** `/scans` takes an optional `limit`, and not forwarding it
 *    means the console gets the service's default of 20 — enough for the history card, and one
 *    less parameter a browser can push upstream. Forward it deliberately if a view ever needs
 *    more.
 *  - **The upstream status passes through untouched** — a list 404 must stay a 404.
 */

/** Browser-facing path (below `/api/iris`) -> the identical path on iris-service. */
const ALLOWED: ReadonlyArray<RegExp> = [
  /^health$/,
  /^metrics$/,
  /^scans$/,
  /^tags$/,
  /^links\/unresolved$/,
];

const UPSTREAM_TIMEOUT_MS = 10_000;

export type BffConfig = {
  /** Server-side `IRIS_SERVICE_URL`. */
  readonly serviceUrl: string | undefined;
  readonly fetch: typeof fetch;
};

/** Calculation: the upstream path for a browser path, or null when it is not allowlisted. */
export function upstreamPath(segments: readonly string[]): string | null {
  const joined = segments.join("/");
  return ALLOWED.some((pattern) => pattern.test(joined)) ? `/${joined}` : null;
}

const json = (status: number, error: string): Response =>
  new Response(JSON.stringify({ error }), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export async function proxyGet(
  segments: readonly string[],
  config: BffConfig,
): Promise<Response> {
  const path = upstreamPath(segments);
  if (path === null) return json(404, "not found");
  if (!config.serviceUrl) return json(500, "IRIS_SERVICE_URL is not configured");

  const url = `${config.serviceUrl.replace(/\/+$/, "")}${path}`;

  try {
    const upstream = await config.fetch(url, {
      method: "GET",
      headers: new Headers({ accept: "application/json, text/plain" }),
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch {
    return json(502, "iris-service could not be reached");
  }
}
