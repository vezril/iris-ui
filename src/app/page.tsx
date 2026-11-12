import { Console } from "@/components/console";

// Renderable without the upstream: the shell and skeletons are static, and all data is fetched in
// the browser through the BFF. The k8s probe on GET / therefore never depends on iris-service.
export default function Page() {
  return <Console />;
}
