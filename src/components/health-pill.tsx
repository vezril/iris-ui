import { CircleCheck, CircleDashed, CircleX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Health } from "@/lib/iris";
import type { Loaded } from "@/lib/loaded";

export type HealthState = "checking" | "live" | "down";

/** Calculation: anything but an explicit UP is Down — an unreachable service is not "unknown". */
export function healthState(loaded: Loaded<Health> | undefined): HealthState {
  if (loaded === undefined) return "checking";
  return loaded.state === "ok" && loaded.data.status === "UP" ? "live" : "down";
}

const PILL = {
  live: { label: "Live", variant: "success", Icon: CircleCheck },
  down: { label: "Down", variant: "destructive", Icon: CircleX },
  checking: { label: "Checking", variant: "default", Icon: CircleDashed },
} as const;

/** Status is never colour-only: every state carries its word and an icon. */
export function HealthPill({ state }: { state: HealthState }) {
  const { label, variant, Icon } = PILL[state];
  return (
    <Badge variant={variant} role="status" aria-live="polite">
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </Badge>
  );
}
