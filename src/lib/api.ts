import { apiBase } from "@/lib/config";
import { toLoaded, toLoadedText, type Loaded } from "@/lib/loaded";

const unreachable = (): Loaded<never> => ({
  state: "error",
  status: null,
  message: "Could not reach the console's own server. Check your connection and retry.",
});

const isConfigError = (e: unknown): boolean =>
  e instanceof Error && e.message.includes("NEXT_PUBLIC_IRIS_API_BASE");

/** The browser's only door to the data: same-origin BFF routes, never iris-service itself. */
export async function getJson<T>(path: string, fetchFn: typeof fetch = fetch): Promise<Loaded<T>> {
  try {
    const res = await fetchFn(`${apiBase()}/${path}`, { cache: "no-store" });
    return await toLoaded<T>(res);
  } catch (e) {
    if (isConfigError(e)) throw e;
    return unreachable();
  }
}

/** Same door, for `GET /metrics` — Prometheus text rather than JSON. */
export async function getText(path: string, fetchFn: typeof fetch = fetch): Promise<Loaded<string>> {
  try {
    const res = await fetchFn(`${apiBase()}/${path}`, { cache: "no-store" });
    return await toLoadedText(res);
  } catch (e) {
    if (isConfigError(e)) throw e;
    return unreachable();
  }
}
