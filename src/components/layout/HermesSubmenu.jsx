// Copyright (c) 2026 MeeJoy

import {
  BarChart3Icon,
  BotIcon,
  BrainIcon,
  CommandIcon,
  CpuIcon,
  FileTextIcon,
  Link2Icon,
  MessageSquareCodeIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

const HERMES_SUBMENU_ITEMS = [
  { id: "analytics", labelKey: "nav.hermesAnalytics", icon: BarChart3Icon },
  { id: "model-config", labelKey: "nav.modelConfig", icon: CpuIcon },
  { id: "prompt-market", labelKey: "nav.promptMarket", icon: MessageSquareCodeIcon },
  { id: "channels", labelKey: "nav.hermesChannels", icon: Link2Icon },
  { id: "memory", labelKey: "nav.hermesMemory", icon: BrainIcon },
  { id: "logs", labelKey: "nav.hermesLogs", icon: FileTextIcon },
  { id: "agents", labelKey: "nav.hermesAgents", icon: BotIcon },
  { id: "commands", labelKey: "nav.hermesCommands", icon: CommandIcon },
]

export function HermesSubmenu({
  activeView,
  onSelect,
  className,
}) {
  const { t } = useI18n()

  return (
    <div className={cn("flex flex-col gap-1 p-2", className)}>
      {HERMES_SUBMENU_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = activeView === item.id
        return (
          <Button
            key={item.id}
            variant="ghost"
            size="sm"
            onClick={() => onSelect(item.id)}
            className={cn(
              "justify-start gap-2.5 h-9 rounded-[10px] border text-[12px] shadow-none",
              isActive
                ? "border-primary/20 bg-primary/10 text-primary hover:bg-primary/12"
                : "border-border/68 bg-background/52 text-muted-foreground hover:border-border/86 hover:bg-accent/42 hover:text-foreground"
            )}
          >
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-[8px] border",
                isActive
                  ? "border-primary/16 bg-primary/10"
                  : "border-border/66 bg-background/72"
              )}>
              <Icon className="size-3.5" />
            </span>
            <span>{t(item.labelKey)}</span>
          </Button>
        )
      })}
    </div>
  )
}
