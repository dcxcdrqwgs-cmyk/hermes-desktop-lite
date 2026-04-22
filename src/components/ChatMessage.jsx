import { motion as Motion } from "framer-motion"
import { SparklesIcon, User2Icon } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

const MotionDiv = ({ children, className, direction = "up", delay = 0 }) => (
  <Motion.div
    initial={{ opacity: 0, y: direction === "up" ? 12 : -12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1], delay }}
    className={className}>
    {children}
  </Motion.div>
)

function StreamingCursor() {
  return (
    <Motion.span
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.75, repeat: Infinity }}
      className="ml-0.5 inline-block h-4 w-0.5 rounded-full bg-primary align-middle"
    />
  )
}

function MessageTimestamp({ timestamp, className }) {
  if (!timestamp) return null

  return (
    <span className={cn("mono text-[11px] text-muted-foreground", className)}>
      {timestamp}
    </span>
  )
}

export function UserMessage({ content, timestamp }) {
  const { t } = useI18n()

  return (
    <MotionDiv className="flex justify-end">
      <div className="max-w-[82%] space-y-1.5 md:max-w-[72%]">
        <div className="flex items-center justify-end gap-2">
          <Badge
            variant="outline"
            className="app-chip rounded-full border-border/80 bg-background/68 px-2.5 py-0.5 text-[11px] text-muted-foreground">
            {t("chat.you")}
          </Badge>
          <Avatar
            size="sm"
            className="ring-1 ring-border/70 [&_[data-slot=avatar-fallback]]:bg-primary [&_[data-slot=avatar-fallback]]:text-primary-foreground">
            <AvatarFallback>
              <User2Icon className="size-3.5" />
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="rounded-[1.15rem] rounded-br-md border border-primary/16 bg-primary px-3.5 py-2.5 text-primary-foreground shadow-[0_12px_28px_color-mix(in_srgb,var(--primary)_16%,transparent)]">
          <p className="whitespace-pre-wrap break-words text-[14px] leading-6">{content}</p>
        </div>

        <div className="flex justify-end">
          <MessageTimestamp timestamp={timestamp} />
        </div>
      </div>
    </MotionDiv>
  )
}

export function AIMessage({ content, timestamp, isStreaming = false }) {
  const { t } = useI18n()

  return (
    <MotionDiv className="flex justify-start">
      <div className="max-w-[90%] md:max-w-[82%]">
        <div className="flex items-start gap-3">
          <Avatar
            size="sm"
            className="mt-1 ring-1 ring-primary/15 [&_[data-slot=avatar-fallback]]:bg-gradient-to-br [&_[data-slot=avatar-fallback]]:from-primary [&_[data-slot=avatar-fallback]]:to-primary/70 [&_[data-slot=avatar-fallback]]:text-primary-foreground">
            <AvatarFallback>
              <SparklesIcon className="size-3.5" />
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-foreground">
                {t("chat.assistantName")}
              </span>
              <Badge
                variant="outline"
                className="rounded-full border-primary/14 bg-primary/7 px-2.5 py-0.5 text-[11px] text-primary">
                {t("chat.agentBadge")}
              </Badge>
            </div>

            <div className="app-panel rounded-[1.15rem] rounded-tl-md px-3.5 py-2.5">
              <p className="whitespace-pre-wrap break-words text-[14px] leading-6 text-foreground">
                {content}
                {isStreaming && <StreamingCursor />}
              </p>
            </div>

            <MessageTimestamp timestamp={timestamp} className="px-1" />
          </div>
        </div>
      </div>
    </MotionDiv>
  )
}

export { MotionDiv, StreamingCursor }
