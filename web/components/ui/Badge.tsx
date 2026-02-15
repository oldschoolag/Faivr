import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium",
  {
    variants: {
      variant: {
        default: "bg-white/5 border border-white/10 text-zinc-400",
        success: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400",
        warning: "bg-amber-500/10 border border-amber-500/20 text-amber-400",
        info: "bg-blue-500/10 border border-blue-500/20 text-blue-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
