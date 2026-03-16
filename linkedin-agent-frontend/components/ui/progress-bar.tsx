"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  color?: "blue" | "green" | "orange" | "red";
  className?: string;
}

export function ProgressBar({ value, max, color = "blue", className }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
  };
  
  return (
    <div className={cn("w-full bg-gray-200 rounded-full h-3", className)}>
      <div
        className={cn("rounded-full h-3 transition-all duration-300", colorClasses[color])}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
