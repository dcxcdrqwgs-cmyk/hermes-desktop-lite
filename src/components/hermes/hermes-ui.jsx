// Copyright (c) 2026 MeeJoy

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const TONE_STYLES = {
  default: {
    card: "border-border/74 bg-background/72",
    icon: "border-border/70 bg-background/86 text-primary",
  },
  emerald: {
    card: "border-emerald-500/18 bg-emerald-500/[0.045]",
    icon: "border-emerald-500/18 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  amber: {
    card: "border-amber-500/18 bg-amber-500/[0.045]",
    icon: "border-amber-500/18 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  blue: {
    card: "border-sky-500/18 bg-sky-500/[0.045]",
    icon: "border-sky-500/18 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  violet: {
    card: "border-violet-500/18 bg-violet-500/[0.045]",
    icon: "border-violet-500/18 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
}

export function HermesMetricCard({ icon: Icon, label, value, hint, tone = "default", className }) {
  const style = TONE_STYLES[tone] || TONE_STYLES.default

  return (
    <Card className={cn("app-panel overflow-hidden rounded-[14px] py-0 shadow-none", style.card, className)}>
      <CardContent className="relative flex items-start justify-between gap-4 px-4 py-4">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 truncate text-[1.55rem] font-semibold tracking-tight text-foreground">
            {value}
          </div>
          {hint ? <div className="mt-1 text-[12px] text-muted-foreground">{hint}</div> : null}
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-[12px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]",
            style.icon
          )}>
          <Icon className="size-4" />
        </div>
      </CardContent>
    </Card>
  )
}

export function HermesSectionCard({
  icon: Icon,
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}) {
  return (
    <Card className={cn("app-panel overflow-hidden rounded-[14px] border-border/74 py-0 shadow-none", className)}>
      <CardHeader className="border-b border-border/72 bg-sidebar/28 px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
              {Icon ? (
                <span className="flex size-7 items-center justify-center rounded-[10px] border border-border/70 bg-background/88 text-primary">
                  <Icon className="size-3.5" />
                </span>
              ) : null}
              <span className="truncate">{title}</span>
            </CardTitle>
            {description ? (
              <div className="mt-2 text-[12px] leading-5.5 text-muted-foreground">{description}</div>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </CardHeader>
      <CardContent className={cn("px-4 py-4", contentClassName)}>{children}</CardContent>
    </Card>
  )
}

export function HermesEmptyState({ title, description, className }) {
  return (
    <div
      className={cn(
        "rounded-[13px] border border-dashed border-border/74 bg-background/42 px-4 py-8 text-center",
        className
      )}>
      <div className="text-[13px] font-medium text-foreground">{title}</div>
      {description ? (
        <div className="mt-2 text-[12px] leading-6 text-muted-foreground">{description}</div>
      ) : null}
    </div>
  )
}
