// Copyright (c) 2026 MeeJoy

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

const workspaceTriggerClass =
  "group/workspace relative flex w-full items-center gap-2.5 overflow-hidden rounded-[14px] border border-[#d3d6df] text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_1px_2px_rgba(15,23,42,0.045)] outline-none transition-[background-color,border-color,box-shadow,transform] duration-[var(--motion-duration-soft)] ease-[var(--motion-ease-soft)] hover:border-[#c4c9d4] hover:bg-sidebar-accent/62 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_4px_12px_rgba(15,23,42,0.07)] focus-visible:ring-[2px] focus-visible:ring-ring/18 active:scale-[0.992] data-[state=open]:border-[#c4c9d4] data-[state=open]:bg-sidebar-accent/68 data-[state=open]:shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_5px_14px_rgba(15,23,42,0.08)] dark:border-white/14 dark:hover:border-white/22 dark:data-[state=open]:border-white/24"

const workspaceItemClass =
  "group/workspace-item min-h-[54px] rounded-[11px] border border-transparent px-2.5 py-2 transition-[background-color,border-color,box-shadow,transform] duration-[var(--motion-duration-soft)] ease-[var(--motion-ease-soft)] hover:bg-sidebar-accent/70 focus:bg-sidebar-accent/75"

const workspaceActionItemClass =
  "min-h-9 rounded-[10px] px-2.5 py-2 text-[13px] font-medium text-sidebar-foreground transition-[background-color,color,transform] duration-[var(--motion-duration-soft)] ease-[var(--motion-ease-soft)] hover:bg-sidebar-accent/70 focus:bg-sidebar-accent/75 data-[disabled]:opacity-70"

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
            data-workspace-switcher="true"
            variant="outline"
            size="icon"
            className="mx-auto size-9 rounded-[12px] border-[#d3d6df] bg-sidebar/74 text-sidebar-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_1px_2px_rgba(15,23,42,0.045)] hover:border-[#c4c9d4] hover:bg-sidebar-accent/72 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_4px_12px_rgba(15,23,42,0.07)] dark:border-white/14 dark:hover:border-white/22">
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
          data-workspace-switcher="true"
          type="button"
          title={currentWorkspace.path}
          className={cn(
            workspaceTriggerClass,
            compact
              ? "mb-3 min-h-[50px] bg-sidebar/74 px-2.5 py-2"
              : "bg-sidebar/74 px-3 py-2.5"
          )}>
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-white/72 to-sidebar-accent/82 text-[15px] text-sidebar-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_1px_2px_rgba(15,23,42,0.05)] ring-1 ring-white/58 transition-[box-shadow,transform,background-color] duration-[var(--motion-duration-soft)] ease-[var(--motion-ease-soft)] group-hover/workspace:scale-[1.025] group-hover/workspace:ring-white/70 group-data-[state=open]/workspace:to-sidebar-accent/95",
              compact
                ? "size-8"
                : "size-9"
            )}>
            {currentWorkspace.icon || "📁"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold leading-4 text-sidebar-foreground">
              {currentWorkspace.name}
            </div>
            <div className="mono mt-0.5 truncate text-[11px] leading-[14px] text-muted-foreground">
              {showPath ? currentWorkspace.path : t("workspace.localDirectory")}
            </div>
          </div>

          <span className="ml-0.5 flex size-7 shrink-0 items-center justify-center rounded-[9px] text-muted-foreground transition-[background-color,color,transform] duration-[var(--motion-duration-soft)] ease-[var(--motion-ease-soft)] group-hover/workspace:bg-sidebar-accent/86 group-hover/workspace:text-sidebar-foreground group-data-[state=open]/workspace:bg-sidebar-accent/95 group-data-[state=open]/workspace:text-sidebar-foreground">
            <ChevronDownIcon className="size-3.5 transition-transform duration-[var(--motion-duration-soft)] ease-[var(--motion-ease-soft)] group-data-[state=open]/workspace:rotate-180" />
          </span>
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
      data-workspace-menu="true"
      align="start"
      sideOffset={8}
      className="w-[292px] max-w-[calc(100vw-24px)] rounded-[14px] border-sidebar-border/80 bg-sidebar/96 p-1.5 shadow-[0_18px_48px_rgba(15,23,42,0.14)] backdrop-blur-2xl dark:shadow-[0_20px_52px_rgba(0,0,0,0.34)]">
      {workspaces.map((workspace) => (
        <DropdownMenuItem
          key={workspace.id}
          onClick={() => onSwitch?.(workspace)}
          className={cn(
            workspaceItemClass,
            workspace.id === currentWorkspace.id
              ? "border-primary/16 bg-primary/7 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] hover:bg-primary/8 focus:bg-primary/8"
              : "hover:border-sidebar-border/55"
          )}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-sidebar-accent/84 text-base text-sidebar-foreground ring-1 ring-sidebar-border/55 transition-colors",
                workspace.id === currentWorkspace.id && "bg-primary/10 text-primary ring-primary/14"
              )}>
              {workspace.icon || "📁"}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold leading-4 text-sidebar-foreground">
                {workspace.name}
              </div>
              <div className="mono mt-0.5 truncate text-[11px] leading-[14px] text-muted-foreground">
                {workspace.path}
              </div>
            </div>

            {workspace.id === currentWorkspace.id && (
              <span className="ml-1 flex size-6 shrink-0 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
                <CheckIcon className="size-4 text-primary" />
              </span>
            )}
          </div>
        </DropdownMenuItem>
      ))}

      <DropdownMenuSeparator className="-mx-1.5 my-1.5 bg-sidebar-border/75" />

      <DropdownMenuItem onClick={() => onManage?.()} className={workspaceActionItemClass}>
        <span className="flex size-7 items-center justify-center rounded-[8px] bg-sidebar-accent/84 text-sidebar-foreground">
          <PlusIcon className="size-4 text-sidebar-foreground" />
        </span>
        <span>{t("workspace.newWorkspace")}</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onManage?.()} className={workspaceActionItemClass}>
        <span className="flex size-7 items-center justify-center rounded-[8px] bg-sidebar-accent/84 text-sidebar-foreground">
          <FolderCogIcon className="size-4 text-sidebar-foreground" />
        </span>
        <span>{t("workspace.manageWorkspace")}</span>
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled
        className={cn(workspaceActionItemClass, "text-muted-foreground/65")}>
        <span className="flex size-7 items-center justify-center rounded-[8px] bg-sidebar-accent/60 text-muted-foreground/65">
          <FolderGit2Icon className="size-4 text-muted-foreground/65" />
        </span>
        <span>{t("workspace.localDirectory")}</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}
