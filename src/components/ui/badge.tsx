import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "border-border text-foreground",
      success: "border-success/50 text-success",
      warning: "border-warning/50 text-warning",
      destructive: "border-destructive/60 text-destructive",
      /** "I do not know" — never dressed up as a healthy state. */
      unknown: "border-dashed border-border text-muted-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
