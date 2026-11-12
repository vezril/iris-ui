import { describe, expect, it } from "vitest";
import { toLoaded, toLoadedText } from "@/lib/loaded";

describe("toLoaded", () => {
  it("returns the parsed payload on 200", async () => {
    const loaded = await toLoaded<{ a: number }>(new Response(JSON.stringify({ a: 1 }), { status: 200 }));
    expect(loaded).toEqual({ state: "ok", data: { a: 1 } });
  });

  it("treats a successful empty array as data, not as an error", async () => {
    const loaded = await toLoaded<unknown[]>(new Response("[]", { status: 200 }));
    expect(loaded).toEqual({ state: "ok", data: [] });
  });

  /**
   * The family's visual-truthfulness rule: a 404 from a list route means the route is GONE, never
   * that there is nothing to list. demeter-ui shipped the opposite and had to fix it.
   */
  it("makes a 404 an error that says so", async () => {
    const loaded = await toLoaded(new Response("{}", { status: 404 }));
    expect(loaded.state).toBe("error");
    if (loaded.state === "error") {
      expect(loaded.status).toBe(404);
      expect(loaded.message).toContain("not an empty result");
    }
  });

  it("surfaces the BFF's own error message when it has one", async () => {
    const loaded = await toLoaded(
      new Response(JSON.stringify({ error: "iris-service could not be reached" }), { status: 502 }),
    );
    expect(loaded).toMatchObject({ state: "error", status: 502, message: "iris-service could not be reached" });
  });

  it("fails rather than guessing when the body is not JSON", async () => {
    const loaded = await toLoaded(new Response("<html>nope</html>", { status: 200 }));
    expect(loaded.state).toBe("error");
  });
});

describe("toLoadedText", () => {
  it("returns the raw body on 200, so Prometheus text survives intact", async () => {
    const body = "# HELP x y\n# TYPE x gauge\nx 1\n";
    expect(await toLoadedText(new Response(body, { status: 200 }))).toEqual({ state: "ok", data: body });
  });

  it("explains a JSON error body even though it read the response as text", async () => {
    const loaded = await toLoadedText(
      new Response(JSON.stringify({ error: "IRIS_SERVICE_URL is not configured" }), { status: 500 }),
    );
    expect(loaded).toMatchObject({ state: "error", status: 500, message: "IRIS_SERVICE_URL is not configured" });
  });

  it("falls back to a generic message when the error body is not JSON", async () => {
    const loaded = await toLoadedText(new Response("upstream exploded", { status: 503 }));
    expect(loaded.state).toBe("error");
  });
});
