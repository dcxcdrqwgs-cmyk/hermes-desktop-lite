// Copyright (c) 2026 MeeJoy

import { useMemo } from "react"
import { cn } from "@/lib/utils"

/**
 * TaskProgressTracker - Displays agent task progress as a formatted table
 *
 * Analyzes tool events to identify task steps and renders them with:
 * - Step number and Chinese description
 * - Emoji status: ✅ completed / 🔄 in-progress / ⬜ pending
 * - Execution details (tool name and parameters)
 */
function TaskProgressTracker({ events = [], loading = false }) {
  // Analyze events to build step list
  const steps = useMemo(() => {
    const result = []
    let currentStep = null

    for (const event of events) {
      if (!event) continue

      const isStarted = event.phase === "started"
      const isCompleted = event.status === "completed" || event.phase === "completed"

      if (isStarted) {
        // Start a new step
        currentStep = {
          id: event.callId || `step-${result.length + 1}`,
          toolName: event.name || "unknown",
          arguments: event.arguments,
          status: "in_progress",
          result: null,
        }
        result.push(currentStep)
      } else if (isCompleted && currentStep) {
        // Complete the current step
        currentStep.status = "completed"
        currentStep.result = event.output
      }
    }

    return result
  }, [events])

  // Calculate statistics
  const stats = useMemo(() => {
    const total = steps.length
    const completed = steps.filter((s) => s.status === "completed").length
    const inProgress = steps.filter((s) => s.status === "in_progress").length
    const pending = total - completed - inProgress
    return { total, completed, inProgress, pending }
  }, [steps])

  // Format arguments for display
  const formatArguments = (args) => {
    if (!args) return null
    try {
      const parsed = JSON.parse(args)
      const entries = Object.entries(parsed).slice(0, 3)
      return entries
        .map(([key, value]) => {
          const val = typeof value === "string" ? value : JSON.stringify(value)
          const truncated = val.length > 40 ? `${val.slice(0, 40)}...` : val
          return `${key}=${truncated}`
        })
        .join(", ")
    } catch {
      const truncated = args.length > 60 ? `${args.slice(0, 60)}...` : args
      return truncated
    }
  }

  if (steps.length === 0 && !loading) {
    return null
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-foreground">📋 当前任务进度</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>✅ {stats.completed}</span>
          <span>🔄 {stats.inProgress}</span>
          <span>⬜ {stats.pending}</span>
        </div>
      </div>

      {/* Progress Table */}
      <div className="rounded-lg border border-border bg-card">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">步骤</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">状态</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">执行动作</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((step, index) => {
              const statusIcon =
                step.status === "completed" ? "✅" : step.status === "in_progress" ? "🔄" : "⬜"
              const statusText =
                step.status === "completed"
                  ? "已完成"
                  : step.status === "in_progress"
                    ? "进行中"
                    : "待处理"

              return (
                <tr
                  key={step.id}
                  className={cn(
                    "border-b border-border/50 last:border-0",
                    step.status === "in_progress" && "bg-primary/5"
                  )}>
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-foreground">{index + 1}.</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span>{statusIcon}</span>
                      <span
                        className={cn(
                          "text-[11px]",
                          step.status === "completed"
                            ? "text-emerald-600"
                            : step.status === "in_progress"
                              ? "text-amber-600"
                              : "text-muted-foreground"
                        )}>
                        {statusText}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="space-y-1">
                      <div className="mono text-[11px] text-foreground">
                        {step.toolName}
                        {formatArguments(step.arguments) && (
                          <span className="text-muted-foreground">
                            ({formatArguments(step.arguments)})
                          </span>
                        )}
                      </div>
                      {step.result && (
                        <div className="mono truncate text-[10px] text-muted-foreground">
                          → {step.result.slice(0, 80)}
                          {step.result.length > 80 ? "..." : ""}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Execution Log */}
      {loading && steps.length > 0 && (
        <div className="rounded-lg border border-border bg-sidebar/40 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">🔄 正在执行:</span>
            <span className="mono text-[11px] text-foreground">
              {steps[steps.length - 1]?.toolName}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export { TaskProgressTracker }
