import { CircleAlert, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Errors say what failed and keep Retry visible. */
export function ErrorState({ what, message, onRetry }: { what: string; message: string; onRetry: () => void }) {
  return (
    <Card role="alert" className="border-destructive/60">
      <div className="flex items-start gap-3">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div className="flex flex-col gap-1">
          <p className="font-medium">Could not load {what}</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
      <div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </Card>
  );
}

/** Empty is a successful, empty answer — say what is empty and why that is (or is not) good news. */
export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <Inbox aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="flex flex-col gap-1">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
      </div>
    </Card>
  );
}
