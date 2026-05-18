// Copyright (c) 2026 MeeJoy

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function ViewFrame({
  icon: Icon,
  badge = "Workspace View",
  title,
  description,
  actions,
  actionsClassName,
  inlineDescription = false,
  stackActionsUntilLarge = false,
  children,
  className,
}) {
  const toolbarLayoutClass = stackActionsUntilLarge
    ? "app-toolbar flex flex-col gap-2 border-b border-border/92 px-4 py-3 xl:flex-row xl:items-start xl:justify-between md:px-4"
    : "app-toolbar flex flex-col gap-2 border-b border-border/92 px-4 py-3 md:flex-row md:items-start md:justify-between md:px-4"
  const actionsLayoutClass = stackActionsUntilLarge
    ? "flex w-full flex-col gap-3 xl:w-auto xl:min-w-[18rem] xl:max-w-[34rem] xl:items-end"
    : "flex w-full flex-col gap-3 md:w-auto md:min-w-[18rem] md:max-w-[34rem] md:items-end"

  return (
    <div data-view-frame="true" className="flex h-full min-h-0 flex-col px-0 py-0">
      <div
        data-view-frame-shell="true"
        className={cn(
          "app-shell flex min-h-0 flex-1 flex-col overflow-hidden border-0 py-0 shadow-none",
          className
        )}>
        <div data-view-frame-toolbar="true" className={toolbarLayoutClass}>
          <div className="min-w-0">
            <Badge
              variant="outline"
              className="mb-2 rounded-full border-border/92 bg-sidebar/48 px-2 py-0.5 text-[10px] text-muted-foreground">
              {Icon && <Icon className="size-3.5" />}
              {badge}
            </Badge>
            {inlineDescription ? (
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-[1rem] font-semibold tracking-tight text-foreground md:text-[1.05rem]">
                  {title}
                </h1>
                {description && (
                  <p className="text-[12px] leading-5.5 text-muted-foreground md:text-[13px]">
                    {description}
                  </p>
                )}
              </div>
            ) : (
              <>
                <h1 className="text-[1rem] font-semibold tracking-tight text-foreground md:text-[1.05rem]">
                  {title}
                </h1>
                {description && (
                  <p className="mt-1 max-w-3xl text-[12px] leading-5.5 text-muted-foreground md:text-[13px]">
                    {description}
                  </p>
                )}
              </>
            )}
          </div>

          {actions && (
            <div className={cn(actionsLayoutClass, actionsClassName)}>
              {actions}
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </div>
  )
}
