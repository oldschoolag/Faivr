import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
} as const;

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, padding = "md", children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[28px] border border-slate-200/80 bg-white shadow-[0_20px_60px_-36px_rgba(15,23,42,0.35)]",
        paddingMap[padding],
        hover &&
          "transition-all duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_28px_80px_-42px_rgba(14,165,233,0.35)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
Card.displayName = "Card";

export { Card };
