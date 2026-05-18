// Copyright (c) 2026 MeeJoy

import { BookIcon, PlusIcon } from "lucide-react"
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ViewFrame } from "@/components/view-frame"
import { useI18n } from "@/i18n.jsx"
import { useTheme } from "next-themes"
import { sendChat } from "@/api"
import { isTauri } from "@/api/browser-utils.js"
import { toast } from "sonner"
import { extractHeadings } from "./notebook-preview-utils"
import { exportNotebookDocxArrayBuffer, exportNotebookDocxBlob } from "./notebook-docx-export"
import { splitNotebookTableLayouts } from "./notebook-table-layout-utils"
import { getNotebookAppearanceValues } from "./notebook-theme-utils"
import { NotebookAiPopover } from "./NotebookAiPopover"
import { NotebookToolbar } from "./NotebookToolbar"

const loadNotebookMilkdownEditor = () => import("./NotebookMilkdownEditor")
const loadNotebookPreview = () => import("./NotebookPreview")

const NotebookMilkdownEditor = lazy(() =>
  loadNotebookMilkdownEditor().then((module) => ({ default: module.NotebookMilkdownEditor }))
)
const NotebookPreview = lazy(() =>
  loadNotebookPreview().then((module) => ({ default: module.NotebookPreview }))
)

function DeferredFallback({ children, delay = 120, className }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), delay)
    return () => window.clearTimeout(timer)
  }, [delay])

  if (!visible) return null
  return <div className={className}>{children}</div>
}

export function NotebookEditorPage({
  selectedNote,
  draftTitle,
  draftContent,
  editorMode,
  saveStatus,
  onTitleChange,
  onContentChange,
  onCreateNote,
}) {
  const { t } = useI18n()
  const { resolvedTheme } = useTheme()
  const notebookAppearance = getNotebookAppearanceValues({}, resolvedTheme === "dark")
  const editorRef = useRef(null)
  const { markdown: previewContent } = splitNotebookTableLayouts(draftContent)
  const headings = extractHeadings(previewContent)
  const [activeHeadingId, setActiveHeadingId] = useState("")
  const [activeToolState, setActiveToolState] = useState({
    bold: false,
    italic: false,
    link: false,
    inlineCode: false,
  })
  const [aiOpen, setAiOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState("")
  const [aiSelectedText, setAiSelectedText] = useState("")
  const [aiGeneratedContent, setAiGeneratedContent] = useState("")
  const [aiApplyMode, setAiApplyMode] = useState("below")

  const handleEditorChange = useCallback(
    (nextContent) => {
      onContentChange(nextContent)
    },
    [onContentChange]
  )

  const handleTitleKeyDown = useCallback((event) => {
    if (event.key !== "Enter" || event.isComposing) return
    event.preventDefault()
    editorRef.current?.focusEditorAtStart?.()
  }, [])

  useEffect(() => {
    if (editorMode === "edit") return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]?.target?.id) {
          setActiveHeadingId(visible[0].target.id)
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.1, 0.4, 0.7] }
    )

    headings.forEach((heading) => {
      const id = String(heading.text || "")
        .toLowerCase()
        .trim()
        .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
        .replace(/^-+|-+$/g, "")
      const node = document.getElementById(id)
      if (node) observer.observe(node)
    })

    return () => observer.disconnect()
  }, [editorMode, headings, previewContent])

  function scrollToHeading(text) {
    const id = String(text || "")
      .toLowerCase()
      .trim()
      .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "")
    const target = document.getElementById(id)
    target?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleToolAction = useCallback((action) => {
    editorRef.current?.runToolbarAction(action)
  }, [])

  const exportTextFile = useCallback(async (content, defaultPath) => {
    if (isTauri) {
      const { save } = await import("@tauri-apps/plugin-dialog")
      const filePath = await save({ defaultPath })
      if (!filePath) return false
      const { writeTextFile } = await import("@tauri-apps/plugin-fs")
      await writeTextFile(filePath, content)
      return true
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = defaultPath
    link.click()
    URL.revokeObjectURL(url)
    return true
  }, [])

  const handleExportMarkdown = useCallback(async () => {
    try {
      const title = (draftTitle || t("notebook.untitled")).trim()
      const filename = `${title || "note"}.md`
      const success = await exportTextFile(previewContent, filename)
      if (success) toast.success(t("notebookToolbar.exportMarkdownSuccess"))
    } catch {
      toast.error(t("notebookToolbar.exportFailed"))
    }
  }, [draftTitle, exportTextFile, previewContent, t])

  const handleExportWord = useCallback(async () => {
    try {
      const title = (draftTitle || t("notebook.untitled")).trim()
      const filename = `${title || "note"}.docx`

      if (isTauri) {
        const { save } = await import("@tauri-apps/plugin-dialog")
        const filePath = await save({ defaultPath: filename })
        if (!filePath) return
        const { writeFile } = await import("@tauri-apps/plugin-fs")
        const arrayBuffer = await exportNotebookDocxArrayBuffer({
          title,
          markdown: previewContent,
        })
        await writeFile(filePath, new Uint8Array(arrayBuffer))
      } else {
        const blob = await exportNotebookDocxBlob({
          title,
          markdown: previewContent,
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = filename
        link.click()
        URL.revokeObjectURL(url)
      }

      toast.success(t("notebookToolbar.exportWordSuccess"))
    } catch {
      toast.error(t("notebookToolbar.exportFailed"))
    }
  }, [draftTitle, previewContent, t])

  const handleCopyFullText = useCallback(async () => {
    try {
      const text = `${draftTitle?.trim() || t("notebook.untitled")}\n\n${previewContent}`.trim()
      await navigator.clipboard.writeText(text)
      toast.success(t("notebookToolbar.copyFullTextSuccess"))
    } catch {
      toast.error(t("notebookToolbar.copyFullTextFailed"))
    }
  }, [draftTitle, previewContent, t])

  const handleAiSubmit = useCallback(async () => {
    const nextPrompt = aiPrompt.trim()
    if (!nextPrompt || aiLoading) return

    setAiLoading(true)
    setAiError("")
    setAiGeneratedContent("")

    try {
      const selectionContext = editorRef.current?.getSelectionContext?.()
      const selectedText = selectionContext?.selectedText?.trim() || ""
      const content = await sendChat([
        {
          role: "system",
          content: "You are Hermes Agent helping inside a notebook editor. Return only the content to insert into the notebook. Keep any markdown formatting useful for the user's request.",
        },
        {
          role: "user",
          content: selectedText
            ? `当前选中文本：\n${selectedText}\n\n用户要求：\n${nextPrompt}`
            : nextPrompt,
        },
      ], { model: "hermes-agent" })

      const insertedContent = typeof content === "string"
        ? content
        : content?.content || ""

      if (!insertedContent.trim()) {
        throw new Error(t("notebookAi.emptyResponse"))
      }

      setAiGeneratedContent(insertedContent)
    } catch (error) {
      setAiError(error?.message || t("notebookAi.error"))
    } finally {
      setAiLoading(false)
    }
  }, [aiLoading, aiPrompt, t])

  const handleAiApplyReplace = useCallback(() => {
    if (!aiGeneratedContent.trim()) return
    editorRef.current?.replaceSelectionWithMarkdown?.(aiGeneratedContent)
    setAiOpen(false)
    setAiPrompt("")
    setAiError("")
    setAiGeneratedContent("")
    setAiSelectedText("")
  }, [aiGeneratedContent])

  const handleAiApplyInsertBelow = useCallback(() => {
    if (!aiGeneratedContent.trim()) return
    editorRef.current?.insertMarkdownBelow?.(aiGeneratedContent)
    setAiOpen(false)
    setAiPrompt("")
    setAiError("")
    setAiGeneratedContent("")
    setAiSelectedText("")
  }, [aiGeneratedContent])

  useEffect(() => {
    void loadNotebookMilkdownEditor()
    void loadNotebookPreview()
  }, [])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const nextState = editorRef.current?.getToolbarState?.()
      if (nextState) setActiveToolState(nextState)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [draftContent, editorMode])

  if (!selectedNote) {
    return (
      <ViewFrame
        icon={BookIcon}
        badge={t("notebook.badge")}
        title={t("notebook.title")}
        description={t("notebook.emptyTitle")}
      >
        <div className="flex h-full min-h-0 items-center justify-center px-6">
          <div className="text-center">
            <BookIcon className="mx-auto size-8 opacity-40" />
            <p className="mt-3 text-sm font-medium text-foreground">{t("notebook.emptyTitle")}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">{t("notebook.emptyDescription")}</p>
            <Button size="sm" className="mt-4 rounded-[10px]" onClick={() => onCreateNote(null)}>
              <PlusIcon className="size-4" />
              {t("notebook.newNote")}
            </Button>
          </div>
        </div>
      </ViewFrame>
    )
  }

  const previewFallback = (
    <DeferredFallback
      delay={120}
      className="rounded-[16px] border border-slate-200/80 bg-white p-6 text-[12px] text-slate-500 dark:border-slate-700 dark:bg-card dark:text-slate-400"
    >
      {t("notebook.loadingPreview")}
    </DeferredFallback>
  )

  const editorFallback = (
    <DeferredFallback
      delay={120}
      className="min-h-[26rem] rounded-[16px] border border-slate-200/80 bg-white p-6 text-[12px] text-slate-500 dark:border-slate-700 dark:bg-card dark:text-slate-400"
    >
      {t("notebook.loadingEditor")}
    </DeferredFallback>
  )

  return (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-background">
      <NotebookToolbar
        onToolAction={handleToolAction}
        activeToolState={activeToolState}
        onAiTrigger={() => {
          const selectionContext = editorRef.current?.getSelectionContext?.()
          setAiSelectedText(selectionContext?.selectedText || "")
          setAiGeneratedContent("")
          setAiError("")
          setAiApplyMode(selectionContext?.selectedText ? "replace" : "below")
          setAiOpen(true)
        }}
        onExportMarkdown={handleExportMarkdown}
        onExportWord={handleExportWord}
        onCopyFullText={handleCopyFullText}
      />
      <NotebookAiPopover
        open={aiOpen}
        prompt={aiPrompt}
        selectedText={aiSelectedText}
        loading={aiLoading}
        error={aiError}
        previewContent={aiGeneratedContent}
        applyMode={aiApplyMode}
        onOpenChange={(nextOpen) => {
          setAiOpen(nextOpen)
          if (!nextOpen) {
            setAiError("")
            setAiPrompt("")
            setAiGeneratedContent("")
            setAiSelectedText("")
            setAiApplyMode("below")
          }
        }}
        onPromptChange={setAiPrompt}
        onSubmit={handleAiSubmit}
        onApplyModeChange={setAiApplyMode}
        onApplyReplace={handleAiApplyReplace}
        onApplyInsertBelow={handleAiApplyInsertBelow}
        onUseSelectionPrompt={() => {
          const selectedText = aiSelectedText.trim()
          setAiPrompt(selectedText ? t("notebookAi.polishPrompt") : "")
        }}
      />
      <div className="min-h-0 flex-1 overflow-auto bg-white px-4 py-4 dark:bg-background">
        <div className="mx-auto flex min-h-full max-w-[1360px] gap-4">
          <div className="min-w-0 flex-1">
            {editorMode === "edit" ? (
              <div className="mx-auto max-w-[1060px] rounded-[22px] border border-slate-200/65 bg-white px-3 pb-5 pt-4 shadow-[0_12px_32px_rgba(15,23,42,0.028)] dark:border-slate-700 dark:bg-card dark:shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
                <div className="mb-4 pl-[68px] pr-4">
                  <input
                    value={draftTitle}
                    onChange={(event) => onTitleChange(event.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    placeholder={t("notebook.titlePlaceholder")}
                    className="h-14 w-full border-0 bg-transparent font-semibold leading-none tracking-normal outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                    style={{
                      fontFamily: notebookAppearance.fontFamily,
                      fontSize: Math.max(notebookAppearance.fontSize + 17, 28),
                      color: notebookAppearance.textColor,
                    }}
                  />
                </div>
                <Suspense fallback={editorFallback}>
                  <NotebookMilkdownEditor
                    ref={editorRef}
                    noteId={selectedNote.id}
                    content={previewContent}
                    onChange={handleEditorChange}
                    appearance={notebookAppearance}
                  />
                </Suspense>
              </div>
            ) : editorMode === "split" ? (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.07fr)_minmax(0,0.93fr)]">
                <div className="min-w-0 rounded-[22px] border border-slate-200/65 bg-white px-3 pb-5 pt-4 shadow-[0_12px_32px_rgba(15,23,42,0.028)] dark:border-slate-700 dark:bg-card dark:shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
                  <div className="mb-4 pl-[56px] pr-4">
                    <input
                      value={draftTitle}
                      onChange={(event) => onTitleChange(event.target.value)}
                      onKeyDown={handleTitleKeyDown}
                      placeholder={t("notebook.titlePlaceholder")}
                      className="h-12 w-full border-0 bg-transparent font-semibold leading-none tracking-normal outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                      style={{
                        fontFamily: notebookAppearance.fontFamily,
                        fontSize: Math.max(notebookAppearance.fontSize + 13, 24),
                        color: notebookAppearance.textColor,
                      }}
                    />
                  </div>
                  <Suspense fallback={editorFallback}>
                    <NotebookMilkdownEditor
                      ref={editorRef}
                      noteId={selectedNote.id}
                      content={draftContent}
                      onChange={handleEditorChange}
                      appearance={notebookAppearance}
                    />
                  </Suspense>
                </div>
                <div className="rounded-[20px] border border-slate-200/75 bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-card dark:shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
                  <div className="mx-auto max-w-[760px]">
                    <PreviewHeader title={draftTitle} contentLength={draftContent.length} appearance={notebookAppearance} />
                    <Suspense fallback={previewFallback}>
                      <NotebookPreview content={previewContent} appearance={notebookAppearance} />
                    </Suspense>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-[920px] rounded-[20px] border border-slate-200/75 bg-white p-7 shadow-[0_10px_28px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-card dark:shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
                <PreviewHeader title={draftTitle} contentLength={draftContent.length} appearance={notebookAppearance} />
                <Suspense fallback={previewFallback}>
                  <NotebookPreview content={previewContent} appearance={notebookAppearance} />
                </Suspense>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between px-1 text-[10.5px] text-muted-foreground">
              <div className="rounded-full bg-slate-50/95 px-2.5 py-0.5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] dark:bg-slate-800/85 dark:text-slate-300">{draftContent.length} 字</div>
              <div>{saveStatus === "saving" ? t("notebook.saveSaving") : saveStatus === "saved" ? t("notebook.saveSaved") : t("notebook.saveUnsaved")}</div>
            </div>
          </div>

          {(editorMode === "split" || editorMode === "view") && (
            <aside className="sticky top-4 hidden h-fit w-[176px] shrink-0 rounded-[18px] border border-slate-200/75 bg-white/98 p-3 shadow-[0_8px_22px_rgba(15,23,42,0.028)] dark:border-slate-700 dark:bg-card dark:shadow-[0_12px_30px_rgba(0,0,0,0.18)] xl:block">
              <div className="mb-0.5 text-[11px] font-semibold text-slate-800 dark:text-slate-100">{t("notebook.toc")}</div>
              <div className="mb-2.5 text-[9.5px] text-muted-foreground">{t("notebook.tocDescription")}</div>
              <div className="space-y-1">
                {headings.length > 0 ? (
                  headings.map((heading) => (
                    <button
                      key={heading.id}
                      type="button"
                      onClick={() => scrollToHeading(heading.text)}
                      className={`block w-full rounded-[8px] px-2 py-1.5 text-left text-[10.5px] leading-4 transition-colors ${
                        activeHeadingId === String(heading.text || "")
                          .toLowerCase()
                          .trim()
                          .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
                          .replace(/^-+|-+$/g, "")
                          ? "bg-slate-900 text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] dark:bg-slate-100 dark:text-slate-900"
                          : "text-foreground/65 hover:bg-slate-50 hover:text-foreground dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100"
                      }`}
                      style={{ paddingLeft: `${8 + (heading.level - 1) * 9}px` }}
                    >
                      {heading.text}
                    </button>
                  ))
                ) : (
                  <div className="rounded-[10px] bg-slate-50/90 px-2.5 py-2 text-[11px] text-muted-foreground dark:bg-slate-800/60 dark:text-slate-400">{t("notebook.emptyToc")}</div>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}

function PreviewHeader({ title, contentLength, appearance }) {
  const { t } = useI18n()
  return (
    <div className="mb-8 border-b border-slate-200/75 pb-6 dark:border-slate-700/85">
      <div className="mb-3 flex items-center gap-2 text-[10.5px] text-slate-500 dark:text-slate-400">
        <span className="rounded-full bg-slate-100/90 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-800/85 dark:text-slate-200">{t("notebook.previewBadge")}</span>
        <span>{contentLength} 字</span>
      </div>
      <h1
        className="font-semibold leading-[1.14] tracking-normal"
        style={{
          fontFamily: appearance?.fontFamily,
          fontSize: Math.max((appearance?.fontSize || 15) + 17, 28),
          color: appearance?.textColor,
        }}
      >
        {title?.trim() || t("notebook.untitled")}
      </h1>
    </div>
  )
}
