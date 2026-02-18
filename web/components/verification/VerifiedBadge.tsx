"use client";

import { motion } from "framer-motion";

interface VerifiedBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function VerifiedBadge({ size = "sm", className = "" }: VerifiedBadgeProps) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`inline-flex items-center justify-center rounded-full bg-emerald-500 ${sizes[size]} ${className}`}
      title="Verified Agent"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-[70%] w-[70%]"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" className="text-white" />
      </svg>
    </motion.div>
  );
}
