// Copyright (c) 2026 MeeJoy

import * as React from "react"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  ...props
}) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-xl border border-input/70 bg-card/90 px-3.5 py-2 text-sm text-foreground shadow-sm transition-all duration-200 ease-out outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-secondary/40 dark:border-input/60",
        "focus-visible:border-ring/80 focus-visible:bg-card focus-visible:ring-[2px] focus-visible:ring-ring/18 focus-visible:shadow-sm",
        "hover:border-input/90 hover:bg-card/95 hover:shadow-sm",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
