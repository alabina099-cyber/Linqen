"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Create context for tabs
const TabsContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
} | null>(null)

const useTabs = () => {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error("Tabs components must be wrapped in <Tabs />")
  }
  return context
}

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

const Tabs = ({ value, onValueChange, children, className }: TabsProps) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn("", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, children }, ref) => {
    return (
      <div ref={ref} className={cn("flex", className)} role="tablist">
        {children}
      </div>
    )
  }
)
TabsList.displayName = "TabsList"

interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value: triggerValue, children, className, ...props }, ref) => {
    const { value, onValueChange } = useTabs()
    const isActive = value === triggerValue
    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isActive ? "true" : "false"}
        onClick={() => onValueChange(triggerValue)}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all",
          isActive 
            ? "bg-white text-gray-900 shadow-sm" 
            : "text-gray-500 hover:text-gray-700",
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
TabsTrigger.displayName = "TabsTrigger"

interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value: contentValue, children, className, ...props }, ref) => {
    const { value } = useTabs()
    const isActive = value === contentValue
    
    if (!isActive) return null
    
    return (
      <div
        ref={ref}
        role="tabpanel"
        className={cn("mt-2", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
