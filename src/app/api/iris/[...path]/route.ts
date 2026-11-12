import { proxyGet } from "@/lib/bff";

// Read env per request: the image is environment-agnostic, so nothing here may be frozen at build.
export const dynamic = "force-dynamic";

// GET only, deliberately. Next answers 405 for every other method because none is exported, so
// iris-service's write and reindex routes cannot be reached through this console at all.
export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await context.params;
  return proxyGet(path, { serviceUrl: process.env.IRIS_SERVICE_URL, fetch });
}
