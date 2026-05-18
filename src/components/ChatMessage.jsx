// Copyright (c) 2026 MeeJoy

import { motion as Motion } from "framer-motion"
import { SparklesIcon, User2Icon, CopyIcon, CheckIcon, ExternalLinkIcon, BookPlusIcon } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useTheme } from "next-themes"
import { save } from "@tauri-apps/plugin-dialog"
import PrismLight from "react-syntax-highlighter/dist/esm/prism-light.js"
import oneDark from "react-syntax-highlighter/dist/esm/styles/prism/one-dark.js"
import oneLight from "react-syntax-highlighter/dist/esm/styles/prism/one-light.js"
import { useState, useCallback } from "react"
import { toast } from "sonner"

// Register additional languages (ESM modules - no .default)
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql.js"
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup.js"
import css from "react-syntax-highlighter/dist/esm/languages/prism/css.js"
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript.js"
import python from "react-syntax-highlighter/dist/esm/languages/prism/python.js"

PrismLight.registerLanguage("sql", sql)
PrismLight.registerLanguage("html", markup)
PrismLight.registerLanguage("markup", markup)
PrismLight.registerLanguage("xml", markup)
PrismLight.registerLanguage("css", css)
PrismLight.registerLanguage("javascript", javascript)
PrismLight.registerLanguage("js", javascript)
PrismLight.registerLanguage("python", python)

const SyntaxHighlighter = PrismLight

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

// Code block component with copy + HTML preview + zoom
function CodeBlock({ children, className, ...props }) {
  const { resolvedTheme } = useTheme()
  const [copied, setCopied] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)
  const match = /language-(\w+)/.exec(className || "")
  const code = String(children).replace(/\n$/, "")
  const isDark = resolvedTheme === "dark"
  const language = match ? match[1] : "text"
  const isHtml = language.toLowerCase() === "html"

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success("已复制到剪贴板")
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  const handleOpenHtml = useCallback(async () => {
    if (!isHtml) return
    try {
      const blob = new Blob([code], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      const { Command } = await import("@tauri-apps/plugin-shell")
      const cmd = Command.create("open", [url])
      await cmd.execute()
    } catch (error) {
      console.error("Failed to open HTML:", error)
      toast.error("无法打开 HTML 预览")
    }
  }, [code, isHtml])

  const handleExport = useCallback(async () => {
    try {
      const extensions = {
        html: "html", javascript: "js", js: "js", css: "css", sql: "sql",
        python: "py", xml: "xml", svg: "svg"
      }
      const ext = extensions[language.toLowerCase()] || "txt"
      const filename = `code_${Date.now()}.${ext}`
      const filePath = await save({ defaultPath: filename })
      if (filePath) {
        const { writeTextFile } = await import("@tauri-apps/plugin-fs")
        await writeTextFile(filePath, code)
        toast.success("已导出")
      }
    } catch {
      await navigator.clipboard.writeText(code)
      toast.success("已复制到剪贴板（导出失败）")
    }
  }, [code, language])

  return (
    <>
      <div className={cn("not-prose my-2 rounded-md border border-border/50 overflow-hidden relative", isZoomed && "fixed inset-4 z-50 max-h-[92vh] overflow-auto bg-background")}>
        {/* Header with actions */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-muted/50">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            {language}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsZoomed(!isZoomed)}
              className="h-6 w-6 rounded-md"
              title={isZoomed ? "关闭" : "放大"}>
              {isZoomed ? (
                <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              )}
            </Button>
            {isHtml && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleOpenHtml}
                className="h-6 w-6 rounded-md"
                title="在浏览器中打开">
                <ExternalLinkIcon className="size-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleExport}
              className="h-6 w-6 rounded-md"
              title="导出">
              <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleCopy}
              className="h-6 w-6 rounded-md"
              title="复制代码">
              {copied ? <CheckIcon className="size-3 text-emerald-500" /> : <CopyIcon className="size-3" />}
            </Button>
          </div>
        </div>
        {/* Code content */}
        <SyntaxHighlighter
          {...props}
          style={isDark ? oneDark : oneLight}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: "0.75rem 1rem",
            background: isDark ? "#1a1b26" : "#f6f8fa",
            fontSize: "12px",
            lineHeight: "1.5",
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
      {isZoomed && (
        <div
          className="fixed inset-0 z-[49] backdrop-blur-sm bg-black/30"
          onClick={() => setIsZoomed(false)}
        />
      )}
    </>
  )
}

// Image component with lightbox preview
function ImageBlock({ src, alt, ...props }) {
  const [previewOpen, setPreviewOpen] = useState(false)

  const handleClick = useCallback(() => {
    setPreviewOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setPreviewOpen(false)
  }, [])

  return (
    <>
      <div className="relative my-2 inline-block cursor-zoom-in" onClick={handleClick}>
        <img
          src={src}
          alt={alt || "图片"}
          className="max-w-full rounded-md border border-border/50 max-h-64 object-contain"
          loading="lazy"
          {...props}
        />
      </div>
      {previewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={handleClose}
        >
          <img
            src={src}
            alt={alt || "图片预览"}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="absolute top-4 right-4 rounded-full bg-black/50 hover:bg-black/70"
          >
            ×
          </Button>
        </div>
      )}
    </>
  )
}

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
      <div className="max-w-[82%] space-y-1 md:max-w-[72%]">
        <div className="flex items-center justify-end gap-2">
          <Badge
            variant="outline"
            className="app-chip rounded border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {t("chat.you")}
          </Badge>
          <Avatar
            size="sm"
            className="ring-1 ring-border [&_[data-slot=avatar-fallback]]:bg-primary [&_[data-slot=avatar-fallback]]:text-primary-foreground">
            <AvatarFallback>
              <User2Icon className="size-3.5" />
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="rounded-[10px] rounded-br-[6px] border border-border bg-accent px-3 py-2 text-foreground shadow-none">
          <p className="whitespace-pre-wrap break-words text-[13px] leading-5.5">{content}</p>
        </div>

        <div className="flex justify-end">
          <MessageTimestamp timestamp={timestamp} />
        </div>
      </div>
    </MotionDiv>
  )
}

export function AIMessage({ content, timestamp, isStreaming = false, onDelete, onFollowUp, onSaveToNotebook }) {
  const { t } = useI18n()
  const [msgCopied, setMsgCopied] = useState(false)

  const handleCopyMessage = useCallback(async () => {
    await navigator.clipboard.writeText(content)
    setMsgCopied(true)
    toast.success("消息已复制")
    setTimeout(() => setMsgCopied(false), 2000)
  }, [content])

  const handleFollowUp = useCallback(() => {
    if (onFollowUp) {
      onFollowUp(content)
    }
  }, [content, onFollowUp])

  const handleExport = useCallback(async () => {
    try {
      const filename = `message_${Date.now()}.txt`
      const filePath = await save({ defaultPath: filename })
      if (filePath) {
        const { writeTextFile } = await import("@tauri-apps/plugin-fs")
        await writeTextFile(filePath, content)
        toast.success("已导出")
      }
    } catch {
      await navigator.clipboard.writeText(content)
      toast.success("已复制到剪贴板（导出失败）")
    }
  }, [content])

  return (
    <MotionDiv className="flex justify-start">
      <div className="max-w-[88%] md:max-w-[80%]">
        <div className="flex items-start gap-3">
          <Avatar
            size="sm"
            className="mt-1 ring-1 ring-border [&_[data-slot=avatar-fallback]]:bg-sidebar-accent [&_[data-slot=avatar-fallback]]]text-foreground">
            <AvatarFallback>
              <SparklesIcon className="size-3.5" />
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-foreground">
                  {t("chat.assistantName")}
                </span>
                <Badge
                  variant="outline"
                  className="rounded border-border bg-sidebar px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {t("chat.agentBadge")}
                </Badge>
              </div>
            </div>

            <div className="app-panel rounded-[10px] rounded-tl-[6px] px-3 py-2 group">
              <div className="prose prose-sm max-w-none text-[13px] leading-5.5 text-foreground">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "")
                      const isInline = !match
                      if (isInline) {
                        return <code className="rounded bg-muted px-1 py-0.5 text-[0.9em]" {...props}>{children}</code>
                      }
                      return <CodeBlock className={className} {...props}>{children}</CodeBlock>
                    },
                    img({ src, alt, ...props }) {
                      return <ImageBlock src={src} alt={alt} {...props} />
                    }
                  }}
                >
                  {content}
                </ReactMarkdown>
                {isStreaming && <StreamingCursor />}
              </div>
            </div>

            {/* Message action bar */}
            <div className="flex items-center gap-1 px-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleCopyMessage}
                className="h-6 w-6 rounded-md"
                title="复制">
                {msgCopied ? <CheckIcon className="size-3 text-emerald-500" /> : <CopyIcon className="size-3" />}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleFollowUp}
                className="h-6 w-6 rounded-md"
                title="追问">
                <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleExport}
                className="h-6 w-6 rounded-md"
                title="导出">
                <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDelete()}
                  className="h-6 w-6 rounded-md text-red-400 hover:text-red-500"
                  title="删除">
                  <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </Button>
              )}
              {onSaveToNotebook ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSaveToNotebook()}
                  className="h-6 rounded-md px-2 text-[11px]"
                  title="存入笔记"
                >
                  <BookPlusIcon className="size-3.5" />
                  <span className="ml-1">存入笔记</span>
                </Button>
              ) : null}
              <MessageTimestamp timestamp={timestamp} className="ml-auto" />
            </div>
          </div>
        </div>
      </div>
    </MotionDiv>
  )
}

export { MotionDiv, StreamingCursor }
