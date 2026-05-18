// Copyright (c) 2026 MeeJoy

import { CheckCircle2Icon, CircleIcon, Loader2Icon } from "lucide-react"
import { cn } from "@/lib/utils"

export function TaskStepTrackerUI({ steps = [], compact = false }) {
  if (steps.length === 0) return null

  const completedCount = steps.filter((step) => step.status === "completed").length
  const inProgressCount = steps.filter((step) => step.status === "in_progress").length

  return (
    <div className={cn("space-y-2", compact && "space-y-1")}>
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium text-foreground">任务进度</span>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <CheckCircle2Icon className="size-3 text-emerald-500" />
            {completedCount}
          </span>
          <span className="flex items-center gap-0.5">
            <Loader2Icon className="size-3 text-amber-500" />
            {inProgressCount}
          </span>
          <span className="flex items-center gap-0.5">
            <CircleIcon className="size-3" />
            {steps.length - completedCount - inProgressCount}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        {steps.map((step, index) => {
          const Icon =
            step.status === "completed"
              ? CheckCircle2Icon
              : step.status === "in_progress"
                ? Loader2Icon
                : CircleIcon
          const iconColor =
            step.status === "completed"
              ? "text-emerald-500"
              : step.status === "in_progress"
                ? "text-amber-500"
                : "text-muted-foreground"

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-2.5 rounded-md px-2 py-1.5 transition-colors",
                step.status === "in_progress" && "bg-amber-500/8",
                step.status === "completed" && "bg-emerald-500/5"
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 size-3.5 shrink-0",
                  iconColor,
                  step.status === "in_progress" && "animate-spin"
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[12px]",
                      step.status === "completed" && "text-muted-foreground line-through"
                    )}
                  >
                    {index + 1}. {step.content}
                  </span>
                </div>
                {step.result ? (
                  <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
                    → {step.result}
                  </p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default TaskStepTrackerUI
