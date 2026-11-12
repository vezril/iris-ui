import { describe, expect, it, vi } from "vitest";
import { proxyGet, upstreamPath, type BffConfig } from "@/lib/bff";

const config = (fetchFn: typeof fetch, serviceUrl = "http://iris:8080"): BffConfig => ({
  serviceUrl,
  fetch: fetchFn,
});

/** Typed so `mock.calls` keeps the url/init pair rather than collapsing to an empty tuple. */
const spyFetch = (response: () => Response) =>
  vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => response());

describe("the allowlist", () => {
  it.each([["health"], ["metrics"], ["tags"], ["links/unresolved"]])("allows %s", (path) => {
    expect(upstreamPath(path.split("/"))).toBe(`/${path}`);
  });

  /**
   * The exposure guard, and the reason this file exists. iris-service is unauthenticated and these
   * routes serve the full plaintext of every note; a health console must never widen that.
   */
  it.each([
    ["notes"],
    ["notes/Journal/2026-01-01.md"],
    ["notes/Journal/2026-01-01.md/backlinks"],
    ["graph"],
    ["admin/reindex"],
    ["snapshots"],
    ["links"],
    [""],
  ])("refuses %s", (path) => {
    expect(upstreamPath(path.split("/"))).toBeNull();
  });

  it("is anchored, so a prefix cannot smuggle a longer path through", () => {
    expect(upstreamPath(["metrics", "..", "notes"])).toBeNull();
    expect(upstreamPath(["healthz"])).toBeNull();
    expect(upstreamPath(["tags", "x"])).toBeNull();
  });
});

describe("proxyGet", () => {
  it("404s a path that is not allowlisted, without calling upstream", async () => {
    const fetchFn = vi.fn();
    const res = await proxyGet(["notes"], config(fetchFn as unknown as typeof fetch));
    expect(res.status).toBe(404);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("500s when the upstream is not configured", async () => {
    const fetchFn = vi.fn();
    const res = await proxyGet(["health"], {
      serviceUrl: undefined,
      fetch: fetchFn as unknown as typeof fetch,
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "IRIS_SERVICE_URL is not configured" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("forwards no query string — none of the four endpoints takes one", async () => {
    const fetchFn = spyFetch(() => new Response("{}", { status: 200 }));
    await proxyGet(["tags"], config(fetchFn as unknown as typeof fetch));
    expect(fetchFn.mock.calls[0]?.[0]).toBe("http://iris:8080/tags");
  });

  it("strips a trailing slash from the configured upstream", async () => {
    const fetchFn = spyFetch(() => new Response("{}", { status: 200 }));
    await proxyGet(["health"], config(fetchFn as unknown as typeof fetch, "http://iris:8080/"));
    expect(fetchFn.mock.calls[0]?.[0]).toBe("http://iris:8080/health");
  });

  it("passes the upstream status through untouched, so a 404 stays a 404", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ error: "nope" }), { status: 404 }));
    const res = await proxyGet(["tags"], config(fetchFn as unknown as typeof fetch));
    expect(res.status).toBe(404);
  });

  it("keeps the upstream content type, so Prometheus text is not relabelled as JSON", async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response("iris_index_notes 1\n", {
          status: 200,
          headers: { "content-type": "text/plain; charset=UTF-8" },
        }),
    );
    const res = await proxyGet(["metrics"], config(fetchFn as unknown as typeof fetch));
    expect(res.headers.get("content-type")).toBe("text/plain; charset=UTF-8");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("502s when the service cannot be reached", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    const res = await proxyGet(["health"], config(fetchFn as unknown as typeof fetch));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "iris-service could not be reached" });
  });

  it("sends no credentials of any kind — there are none to leak", async () => {
    const fetchFn = spyFetch(() => new Response("{}", { status: 200 }));
    await proxyGet(["health"], config(fetchFn as unknown as typeof fetch));
    const init = fetchFn.mock.calls[0]?.[1];
    const headers = new Headers(init?.headers);
    expect([...headers.keys()]).toEqual(["accept"]);
    expect(init?.method).toBe("GET");
  });
});
