/**
 * Reading a BFF response, with the family's visual-truthfulness rules baked in.
 *
 * The one that matters: a non-2xx is ALWAYS an error. A 404 from a list route means the route is
 * gone, never that there is nothing to list — rendering it as "nothing here yet" is the
 * truthfulness failure in API costume (demeter-ui shipped and fixed exactly that). Empty is only
 * ever a successful, empty payload.
 */

export type Loaded<T> =
  | { state: "ok"; data: T }
  | { state: "error"; status: number | null; message: string };

const failure = (status: number | null, message: string): Loaded<never> => ({
  state: "error",
  status,
  message,
});

const errorField = (body: unknown): string | undefined =>
  typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
    ? body.error
    : undefined;

function explain(status: number, serverMessage: string | undefined): string {
  if (status === 404) {
    return "iris-service has no such route (404). This is a failure, not an empty result.";
  }
  if (status === 502) return serverMessage ?? "iris-service could not be reached.";
  if (status === 503) return `Not available. ${serverMessage ?? ""}`.trim();
  return serverMessage ?? `Request failed (${status}).`;
}

export async function toLoaded<T>(res: Response): Promise<Loaded<T>> {
  const parsed: unknown = await res.json().catch(() => undefined);
  if (!res.ok) return failure(res.status, explain(res.status, errorField(parsed)));
  if (parsed === undefined) {
    return failure(res.status, "iris-service sent a response that could not be read.");
  }
  return { state: "ok", data: parsed as T };
}

/**
 * `GET /metrics` is Prometheus text, not JSON, so it gets its own reader. An error body from the
 * BFF is still JSON, hence the two-step: text first, then try to explain it.
 */
export async function toLoadedText(res: Response): Promise<Loaded<string>> {
  const body = await res.text().catch(() => undefined);
  if (!res.ok) {
    let message: string | undefined;
    try {
      message = errorField(JSON.parse(body ?? ""));
    } catch {
      message = undefined;
    }
    return failure(res.status, explain(res.status, message));
  }
  if (body === undefined) {
    return failure(res.status, "iris-service sent a response that could not be read.");
  }
  return { state: "ok", data: body };
}
