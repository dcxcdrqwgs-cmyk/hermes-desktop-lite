import {
  CheckIcon,
  ChevronDownIcon,
  FolderCogIcon,
  FolderGit2Icon,
  PlusIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

const DEFAULT_WORKSPACE = {
  id: "default",
  name: "默认工作区",
  path: "~/AI/hermes-workspace",
  icon: "📁",
}

export default function WorkspaceSwitcher({
  collapsed = false,
  compact = false,
  showPath = true,
  currentWorkspace = DEFAULT_WORKSPACE,
  workspaces = [DEFAULT_WORKSPACE],
  onSwitch,
  onManage,
}) {
  const { t } = useI18n()

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="mx-auto size-9 rounded-[0.95rem] border-sidebar-border/80 bg-sidebar-accent/74 text-sidebar-foreground shadow-none hover:bg-sidebar-accent">
            <span className="text-base">{currentWorkspace.icon || "📁"}</span>
          </Button>
        </DropdownMenuTrigger>

        <WorkspaceMenu
          currentWorkspace={currentWorkspace}
          workspaces={workspaces}
          onSwitch={onSwitch}
          onManage={onManage}
          t={t}
        />
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={currentWorkspace.path}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-[1rem] border border-sidebar-border/80 text-left transition-colors",
            compact
              ? "h-11 bg-sidebar/52 px-2.5 py-2 hover:bg-sidebar-accent/76"
              : "bg-sidebar-accent/56 px-2.5 py-2.5 hover:bg-sidebar-accent/84"
          )}>
          <div
            className={cn(
              "flex items-center justify-center text-base text-primary",
              compact
                ? "size-7 rounded-[0.8rem] bg-background/72"
                : "size-8 rounded-[0.85rem] bg-background/84"
            )}>
            {currentWorkspace.icon || "📁"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-foreground">
              {currentWorkspace.name}
            </div>
            {showPath && (
              <div className="mono truncate text-[11px] text-muted-foreground">
                {currentWorkspace.path}
              </div>
            )}
          </div>

          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground/70" />
        </button>
      </DropdownMenuTrigger>

      <WorkspaceMenu
        currentWorkspace={currentWorkspace}
        workspaces={workspaces}
        onSwitch={onSwitch}
        onManage={onManage}
        t={t}
      />
    </DropdownMenu>
  )
}

function WorkspaceMenu({ currentWorkspace, workspaces, onSwitch, onManage, t }) {
  return (
    <DropdownMenuContent
      align="start"
      className="w-80 rounded-[1.15rem] border-border/82 bg-popover/96 p-1.5">
      {workspaces.map((workspace) => (
        <DropdownMenuItem
          key={workspace.id}
          onClick={() => onSwitch?.(workspace)}
          className={cn(
            "rounded-[0.95rem] px-3 py-2.5",
            workspace.id === currentWorkspace.id && "bg-accent"
          )}>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-[0.95rem] bg-primary/10 text-base text-primary">
              {workspace.icon || "📁"}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-foreground">
                {workspace.name}
              </div>
              <div className="mono truncate text-[11px] text-muted-foreground">
                {workspace.path}
              </div>
            </div>

            {workspace.id === currentWorkspace.id && (
              <CheckIcon className="size-4 shrink-0 text-primary" />
            )}
          </div>
        </DropdownMenuItem>
      ))}

      <DropdownMenuSeparator />

      <DropdownMenuItem onClick={() => onManage?.()} className="rounded-[0.9rem] px-3 py-2.5">
        <PlusIcon className="size-4" />
        {t("workspace.newWorkspace")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onManage?.()} className="rounded-[0.9rem] px-3 py-2.5">
        <FolderCogIcon className="size-4" />
        {t("workspace.manageWorkspace")}
      </DropdownMenuItem>
      <DropdownMenuItem disabled className="rounded-[0.9rem] px-3 py-2.5">
        <FolderGit2Icon className="size-4" />
        {t("workspace.localDirectory")}
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}
