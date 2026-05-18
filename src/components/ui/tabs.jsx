// Copyright (c) 2026 MeeJoy

import * as React from "react"
import { cn } from "@/lib/utils"

const TabsContext = React.createContext({
  value: "",
  onValueChange: () => {},
})

function Tabs({ value, onValueChange, className, children, ...props }) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn("flex flex-col", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

function TabsList({ className, children, ...props }) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex h-9 items-center justify-center rounded-[9px] bg-secondary/72 p-1", className)}
      {...props}>
      {children}
    </div>
  )
}

function TabsTrigger({ value, className, children, ...props }) {
  const context = React.useContext(TabsContext)
  const isActive = context.value === value

  return (
    <button
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"}
      onClick={() => context.onValueChange(value)}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow,transform] duration-[var(--motion-duration-soft)] ease-[var(--motion-ease-soft)] active:scale-[0.99]",
        "data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-[0_1px_2px_rgba(0,0,0,0.06)]",
        "data-[state=inactive]:text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        className
      )}
      {...props}>
      {children}
    </button>
  )
}

function TabsContent({ value, className, children, ...props }) {
  const context = React.useContext(TabsContext)
  const isActive = context.value === value

  if (!isActive) return null

  return (
    <div
      role="tabpanel"
      data-state={isActive ? "active" : "inactive"}
      className={cn("flex-1", className)}
      {...props}>
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
