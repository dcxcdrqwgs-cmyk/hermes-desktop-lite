// Copyright (c) 2026 MeeJoy

import React from "react"
import { I18nProvider } from "@/i18n"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { Badge } from "@/components/ui/badge"
import { AppInner } from "./AppInner"

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    console.error("Render error:", error, errorInfo)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="app-panel-strong max-w-2xl rounded-[2rem] p-8">
            <Badge variant="destructive" className="mb-4 rounded-full px-3 py-1 text-[11px]">
              {this.props.labels.badge}
            </Badge>
            <h2 className="text-2xl font-semibold text-foreground">{this.props.labels.title}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {this.state.error.message}
            </p>
            <details className="mt-6 overflow-hidden rounded-[1.4rem] border border-border/70 bg-background/70">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-primary">
                {this.props.labels.stack}
              </summary>
              <pre className="overflow-auto border-t border-border/70 px-4 py-4 text-xs text-muted-foreground">
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default function App() {
  return (
    <I18nProvider>
      <TooltipProvider delayDuration={0}>
        <ErrorBoundary
          labels={{
            badge: "渲染异常",
            title: "界面渲染失败",
            stack: "查看组件堆栈",
          }}>
          <Toaster richColors closeButton />
          <AppInner />
        </ErrorBoundary>
      </TooltipProvider>
    </I18nProvider>
  )
}
