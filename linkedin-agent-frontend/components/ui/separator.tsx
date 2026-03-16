import { cn } from "@/lib/utils"

interface SeparatorProps {
  className?: string
  orientation?: "horizontal" | "vertical"
}

function Separator({ className, orientation = "horizontal" }: SeparatorProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation === "horizontal" ? "horizontal" : "vertical"}
      className={cn(
        "shrink-0 bg-gray-200",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
    />
  )
}

export { Separator }
