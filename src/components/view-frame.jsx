import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function ViewFrame({
  icon: Icon,
  badge = "Workspace View",
  title,
  description,
  actions,
  stackActionsUntilLarge = false,
  children,
  className,
}) {
  const toolbarLayoutClass = stackActionsUntilLarge
    ? "app-toolbar flex flex-col gap-2.5 border-b border-border/74 px-4 py-3 xl:flex-row xl:items-start xl:justify-between md:px-4.5"
    : "app-toolbar flex flex-col gap-2.5 border-b border-border/74 px-4 py-3 md:flex-row md:items-start md:justify-between md:px-4.5"
  const actionsLayoutClass = stackActionsUntilLarge
    ? "flex w-full flex-col gap-3 xl:w-auto xl:min-w-[18rem] xl:max-w-[34rem] xl:items-end"
    : "flex w-full flex-col gap-3 md:w-auto md:min-w-[18rem] md:max-w-[34rem] md:items-end"

  return (
    <div data-view-frame="true" className="flex h-full min-h-0 flex-col px-2 py-2 md:px-2.5 md:py-2.5">
      <div
        data-view-frame-shell="true"
        className={cn(
          "app-panel app-shell flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.2rem] border-border/74 py-0",
          className
        )}>
        <div data-view-frame-toolbar="true" className={toolbarLayoutClass}>
          <div className="min-w-0">
            <Badge
              variant="outline"
              className="mb-2 rounded-full border-primary/14 bg-primary/7 px-2.5 py-0.5 text-[11px] text-primary">
              {Icon && <Icon className="size-3.5" />}
              {badge}
            </Badge>
            <h1 className="text-[1.05rem] font-semibold tracking-tight text-foreground md:text-[1.12rem]">
              {title}
            </h1>
            {description && (
              <p className="mt-1 max-w-3xl text-[13px] leading-5.5 text-muted-foreground md:text-sm">
                {description}
              </p>
            )}
          </div>

          {actions && (
            <div className={actionsLayoutClass}>
              {actions}
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </div>
  )
}
