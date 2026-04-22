import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-[1rem] border border-input bg-background/92 px-3.5 py-2.5 text-sm text-foreground shadow-none transition-[color,box-shadow,border-color,background-color] outline-none placeholder:text-muted-foreground/90 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/45 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
})

export { Textarea }
