// Copyright (c) 2026 MeeJoy

import * as React from "react"
import { cva } from "class-variance-authority"
import * as SlotPrimitive from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-[10px] border border-transparent text-[13px] font-medium tracking-normal whitespace-nowrap transition-all duration-[var(--motion-duration-soft)] ease-[var(--motion-ease-soft)] outline-none active:scale-[0.985] focus-visible:ring-[2px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-primary/12 bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:bg-primary/92",
        destructive:
          "bg-destructive text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:bg-destructive/92",
        outline:
          "border-border/60 bg-card/90 text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-border/80 hover:bg-accent/80 dark:border-input/60 dark:bg-secondary/50 dark:hover:bg-accent/80",
        secondary:
          "border-border/60 bg-secondary/80 text-secondary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:bg-accent/80",
        ghost: "hover:bg-accent/60 hover:text-accent-foreground active:bg-accent/80",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3.5",
        xs: "h-6 gap-1 rounded-lg px-2 text-[11px] has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-lg px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-xl px-6 has-[>svg]:px-4.5",
        icon: "size-9 rounded-lg",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}, ref) {
  const Comp = asChild ? SlotPrimitive.Root : "button"

  return (
    <Comp
      ref={ref}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
})

export { Button, buttonVariants }
