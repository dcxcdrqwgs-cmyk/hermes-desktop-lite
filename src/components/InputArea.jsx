import { useCallback, useEffect, useMemo, useRef } from "react"
import { open } from "@tauri-apps/plugin-dialog"
import {
  FileIcon,
  ImageIcon,
  Loader2Icon,
  PaperclipIcon,
  SendHorizontalIcon,
  SlashIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react"

import { Popup } from "@/Popup"
import { importAttachmentFromPath, savePastedAttachment } from "@/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { COMMANDS, SKILLS } from "@/data"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

function getActiveToken(value) {
  const match = value.match(/(?:^|\s)([/$][^\s]*)$/)
  if (!match) return null

  const token = match[1]
  if (token.startsWith("/")) {
    return { type: "cmd", raw: token, query: token.slice(1) }
  }

  if (token.startsWith("$")) {
    return { type: "skill", raw: token, query: token.slice(1) }
  }

  return null
}

function inferExtensionFromMime(mimeType) {
  switch (mimeType) {
    case "image/png":
      return "png"
    case "image/jpeg":
      return "jpg"
    case "image/webp":
      return "webp"
    case "image/gif":
      return "gif"
    default:
      return "bin"
  }
}

function uint8ArrayToBase64(bytes) {
  let binary = ""
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function decodeClipboardFilePath(value) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("file://")) {
    return decodeURIComponent(trimmed.replace(/^file:\/\//, ""))
  }
  if (trimmed.startsWith("/")) {
    return trimmed
  }
  return null
}

function fileNameFromPath(path) {
  const normalized = String(path || "").replaceAll("\\", "/")
  return normalized.split("/").pop() || normalized
}

function mergeAttachments(current, nextItems) {
  const seen = new Set(current.map((item) => item.path))
  const merged = [...current]

  for (const item of nextItems) {
    if (!item?.path || seen.has(item.path)) continue
    seen.add(item.path)
    merged.push(item)
  }

  return merged
}

export function InputArea({
  value,
  onChange,
  onSend,
  attachments = [],
  onAttachmentsChange,
  loading,
  embedded = false,
  workspacePath = null,
  wideLayout = false,
}) {
  const { lang, t } = useI18n()
  const textareaRef = useRef(null)
  const activeToken = useMemo(() => getActiveToken(value), [value])
  const composerMaxWidth = wideLayout ? "68rem" : "58rem"

  const getItemDescription = useCallback(
    (item) => (lang === "en" ? item.desc_en || item.desc_zh : item.desc_zh || item.desc_en),
    [lang]
  )

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [adjustHeight, value])

  const replaceActiveToken = useCallback(
    (replacement) => {
      if (!activeToken) {
        onChange(replacement)
        return
      }

      const tokenIndex = value.lastIndexOf(activeToken.raw)
      if (tokenIndex < 0) {
        onChange(value)
        return
      }

      const nextValue = `${value.slice(0, tokenIndex)}${replacement}`
      onChange(nextValue)
    },
    [activeToken, onChange, value]
  )

  const closePopup = useCallback(() => {
    replaceActiveToken("")
    requestAnimationFrame(() => textareaRef.current?.focus())
  }, [replaceActiveToken])

  const handleInput = (event) => {
    onChange(event.target.value)
    adjustHeight()
  }

  const handleKeyDown = (event) => {
    if (activeToken) {
      if (event.key === "Escape") {
        event.preventDefault()
        closePopup()
      }
      return
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      if (!loading && value.trim()) {
        onSend()
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto"
        }
      }
    }
  }

  const handleQueryChange = (query) => {
    if (!activeToken) return
    const prefix = activeToken.type === "cmd" ? "/" : "$"
    replaceActiveToken(`${prefix}${query}`)
  }

  const selectCmd = (item) => {
    replaceActiveToken(`${item.cmd} `)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const selectSkill = (item) => {
    replaceActiveToken(`$${item.name} `)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const handleFileAttach = async () => {
    try {
      const result = await open({ multiple: true, directory: false })
      const paths = Array.isArray(result) ? result : result ? [result] : []
      if (paths.length === 0) return

      onAttachmentsChange?.(
        mergeAttachments(
          attachments,
          await Promise.all(
            paths.map(async (path) => {
              const saved = await importAttachmentFromPath(workspacePath, path)
              return {
                path: saved.path,
                name: fileNameFromPath(saved.path),
                kind: "file",
              }
            })
          )
        )
      )
      requestAnimationFrame(() => textareaRef.current?.focus())
    } catch (error) {
      console.error(error)
    }
  }

  const handlePaste = async (event) => {
    const clipboard = event.clipboardData
    if (!clipboard) return

    const uriList = clipboard.getData("text/uri-list")
    const plainText = clipboard.getData("text/plain")
    const pastedPaths = `${uriList}\n${plainText}`
      .split("\n")
      .map((item) => decodeClipboardFilePath(item))
      .filter(Boolean)

    if (pastedPaths.length > 0) {
      event.preventDefault()
      onAttachmentsChange?.(
        mergeAttachments(
          attachments,
          await Promise.all(
            pastedPaths.map(async (path) => {
              const saved = await importAttachmentFromPath(workspacePath, path)
              return {
                path: saved.path,
                name: fileNameFromPath(saved.path),
                kind: "file",
              }
            })
          )
        )
      )
      requestAnimationFrame(() => textareaRef.current?.focus())
      return
    }

    const files = Array.from(clipboard.files || [])
    if (files.length === 0) return

    event.preventDefault()

    try {
      const nextAttachments = []

      for (const [index, file] of files.entries()) {
        const arrayBuffer = await file.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)
        const dataBase64 = uint8ArrayToBase64(bytes)
        const fileName =
          file.name || `pasted-file-${index + 1}.${inferExtensionFromMime(file.type)}`
        const saved = await savePastedAttachment(
          workspacePath,
          fileName,
          dataBase64,
          file.type.startsWith("image/")
        )
        nextAttachments.push({
          path: saved.path,
          name: fileNameFromPath(saved.path),
          kind: file.type.startsWith("image/") ? "image" : "file",
        })
      }

      onAttachmentsChange?.(mergeAttachments(attachments, nextAttachments))
      requestAnimationFrame(() => textareaRef.current?.focus())
    } catch (error) {
      console.error("Failed to paste attachment:", error)
    }
  }

  const removeAttachment = (path) => {
    onAttachmentsChange?.(attachments.filter((item) => item.path !== path))
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const canSend = !loading && (value.trim().length > 0 || attachments.length > 0)

  return (
    <div
      data-chat-input-width="true"
      style={{ maxWidth: composerMaxWidth }}
      className={cn(
        "mx-auto w-full transition-[max-width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "max-w-full"
      )}>
      <div
        className={cn(
          "app-input-shell relative overflow-visible rounded-[1.05rem]",
          embedded ? "px-1 py-1" : "p-1"
        )}>
        {activeToken?.type === "cmd" && (
          <Popup
            items={COMMANDS}
            onSelect={selectCmd}
            onClose={closePopup}
            query={activeToken.query}
            onQueryChange={handleQueryChange}
            filterFn={(item, query) =>
              !query ||
              item.cmd.toLowerCase().includes(query.toLowerCase()) ||
              item.desc_zh?.includes(query) ||
              item.desc_en?.toLowerCase().includes(query.toLowerCase())
            }
            renderItem={(item) => (
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-foreground">
                    {getItemDescription(item)}
                  </div>
                  <div className="mono text-[11px] text-muted-foreground">
                    {item.alias || "Command"}
                  </div>
                </div>
                <Badge variant="outline" className="mono rounded-full px-2.5 py-1 text-[10px]">
                  {item.cmd}
                </Badge>
              </div>
            )}
          />
        )}

        {activeToken?.type === "skill" && (
          <Popup
            items={SKILLS}
            onSelect={selectSkill}
            onClose={closePopup}
            query={activeToken.query}
            onQueryChange={handleQueryChange}
            filterFn={(item, query) =>
              !query ||
              item.name.toLowerCase().includes(query.toLowerCase()) ||
              item.desc_zh?.includes(query) ||
              item.desc_en?.toLowerCase().includes(query.toLowerCase()) ||
              item.category?.toLowerCase().includes(query.toLowerCase())
            }
            renderItem={(item) => (
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="mono text-sm font-medium text-foreground">${item.name}</div>
                  <div className="text-xs leading-5 text-muted-foreground">
                    {getItemDescription(item)}
                  </div>
                </div>
                <Badge variant="secondary" className="mono rounded-full px-2.5 py-1 text-[10px]">
                  {item.category}
                </Badge>
              </div>
            )}
          />
        )}

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3.5 pt-3">
            {attachments.map((attachment) => {
              const Icon = attachment.kind === "image" ? ImageIcon : FileIcon
              return (
                <div
                  key={attachment.path}
                  className="app-panel flex max-w-full items-start gap-2 rounded-[0.95rem] border-border/74 px-3 py-2">
                  <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-foreground">{attachment.name}</p>
                    <p className="mono truncate text-[10px] text-muted-foreground" title={attachment.path}>
                      {attachment.path}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="ml-1 shrink-0 rounded-xl"
                    onClick={() => removeAttachment(attachment.path)}
                    title={t("input.removeAttachment")}
                    aria-label={t("input.removeAttachment")}>
                    <XIcon className="size-3.5" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        <div className="px-3.5 pt-2.5">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={(event) => {
              void handlePaste(event)
            }}
            disabled={loading}
            rows={1}
            placeholder={t("input.placeholder")}
            className={cn(
              "min-h-[58px] resize-none border-0 bg-transparent px-0 py-0 text-[14px] leading-6 shadow-none focus-visible:ring-0",
              "placeholder:text-muted-foreground"
            )}
          />
        </div>

        <div className="app-input-footer flex flex-col gap-2 px-3.5 py-2.5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleFileAttach}
              className="rounded-[0.9rem] text-muted-foreground hover:bg-accent hover:text-foreground"
              title={t("input.attachFile")}>
              <PaperclipIcon className="size-4" />
            </Button>

            <Badge
              variant="outline"
              className="app-chip rounded-full px-2.5 py-0.5 text-[11px] text-muted-foreground">
              <SlashIcon className="size-3.5" />
              {t("input.commandChip")}
            </Badge>
            <Badge
              variant="outline"
              className="app-chip rounded-full px-2.5 py-0.5 text-[11px] text-muted-foreground">
              <SparklesIcon className="size-3.5" />
              {t("input.skillChip")}
            </Badge>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="mono hidden text-[11px] text-muted-foreground md:inline">
              {t("input.sendHint")}
            </span>

            {loading ? (
              <Button disabled className="h-10 rounded-[0.95rem] px-4">
                <Loader2Icon className="size-4 animate-spin" />
                {t("input.responding")}
              </Button>
            ) : (
              <Button
                onClick={onSend}
                disabled={!canSend}
                className="h-10 rounded-[0.95rem] px-4">
                <SendHorizontalIcon className="size-4" />
                {t("input.send")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
