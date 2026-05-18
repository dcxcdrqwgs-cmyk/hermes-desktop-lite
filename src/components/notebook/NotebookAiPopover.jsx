// Copyright (c) 2026 MeeJoy

import { Loader2Icon, SparklesIcon, ReplaceIcon, ArrowDownToLineIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/i18n.jsx"

export function NotebookAiPopover({
  open,
  prompt,
  selectedText,
  loading,
  error,
  previewContent,
  applyMode,
  onOpenChange,
  onPromptChange,
  onSubmit,
  onApplyModeChange,
  onApplyReplace,
  onApplyInsertBelow,
  onUseSelectionPrompt,
}) {
  const { t } = useI18n()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[520px] gap-3 rounded-[16px] border-border/70 bg-popover/97 p-4 shadow-[0_18px_48px_rgba(15,23,42,0.14)] backdrop-blur-2xl sm:max-w-[520px] dark:shadow-[0_24px_62px_rgba(0,0,0,0.36)]"
      >
        <DialogHeader className="gap-1">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,rgba(56,189,248,0.16),rgba(99,102,241,0.16))] text-sky-600 dark:text-sky-300">
              <SparklesIcon className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-[14px] font-semibold tracking-normal">
                {t("notebookAi.title")}
              </DialogTitle>
              <DialogDescription className="text-[12px] text-muted-foreground">
                {t("notebookAi.description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit?.()
          }}
        >
          {selectedText ? (
            <div className="rounded-[11px] border border-border/70 bg-white/70 px-3 py-2 dark:bg-slate-900/40">
              <div className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {t("notebookAi.selectedLabel")}
              </div>
              <div className="max-h-[88px] overflow-auto whitespace-pre-wrap text-[12px] leading-5 text-slate-700 dark:text-slate-200">
                {selectedText}
              </div>
            </div>
          ) : null}

          <Textarea
            value={prompt}
            onChange={(event) => onPromptChange?.(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault()
                onSubmit?.()
              }
            }}
            placeholder={t("notebookAi.placeholder")}
            className="min-h-[112px] resize-none rounded-[12px] border-border/72 bg-white/88 text-[13px] leading-6 dark:bg-slate-900/52"
            autoFocus
          />

          {selectedText && !previewContent ? (
            <div className="flex items-center justify-start">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onUseSelectionPrompt?.()}
                className="h-7 rounded-[9px] px-2.5 text-[11px] text-slate-600 dark:text-slate-300"
              >
                <SparklesIcon className="size-3.5" />
                {t("notebookAi.polishSelection")}
              </Button>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-[10px] border border-destructive/20 bg-destructive/6 px-3 py-2 text-[12px] text-destructive dark:border-destructive/30 dark:bg-destructive/10">
              {error}
            </div>
          ) : loading ? (
            <div className="rounded-[10px] border border-sky-200/60 bg-sky-50/70 px-3 py-2 text-[12px] text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
              {t("notebookAi.requesting")}
            </div>
          ) : null}

          {previewContent ? (
            <div className="rounded-[12px] border border-border/70 bg-white/78 p-3 dark:bg-slate-900/44">
              <div className="mb-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {t("notebookAi.previewLabel")}
              </div>
              <div className="max-h-[180px] overflow-auto whitespace-pre-wrap text-[12px] leading-5 text-slate-700 dark:text-slate-100">
                {previewContent}
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange?.(false)}
              className="h-8 rounded-[10px] px-3 text-[12px]"
            >
              {t("common.cancel")}
            </Button>
            {previewContent ? (
              <>
                <div className="mr-auto space-y-1">
                  <div className="inline-flex h-8 items-center rounded-[10px] border border-border/72 bg-white/78 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:bg-slate-900/44 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <button
                      type="button"
                      onClick={() => onApplyModeChange?.("below")}
                      className={`inline-flex h-7 items-center gap-1 rounded-[8px] px-2.5 text-[11px] transition-colors active:scale-[0.99] ${
                        applyMode === "below"
                          ? "bg-slate-900 text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] dark:bg-slate-100 dark:text-slate-900"
                          : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/8 dark:hover:text-white"
                      }`}
                    >
                      <ArrowDownToLineIcon className="size-3.5" />
                      {t("notebookAi.insert")}
                    </button>
                    <button
                      type="button"
                      disabled={!selectedText}
                      onClick={() => onApplyModeChange?.("replace")}
                      className={`inline-flex h-7 items-center gap-1 rounded-[8px] px-2.5 text-[11px] transition-colors active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45 ${
                        applyMode === "replace"
                          ? "bg-slate-900 text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] dark:bg-slate-100 dark:text-slate-900"
                          : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/8 dark:hover:text-white"
                      }`}
                    >
                      <ReplaceIcon className="size-3.5" />
                      {t("notebookAi.replace")}
                    </button>
                  </div>
                  {applyMode === "below" ? (
                    <div className="px-1 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
                      {t("notebookAi.insertBelowHint")}
                    </div>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (applyMode === "replace") {
                      onApplyReplace?.()
                    } else if (applyMode === "below") {
                      onApplyInsertBelow?.()
                    }
                  }}
                  className="h-8 rounded-[10px] px-3 text-[12px]"
                >
                  <SparklesIcon className="size-3.5" />
                  {t("notebookAi.apply")}
                </Button>
              </>
            ) : (
              <Button
                type="submit"
                size="sm"
                disabled={loading || !prompt.trim()}
                className="h-8 rounded-[10px] px-3 text-[12px]"
              >
                {loading ? <Loader2Icon className="size-3.5 animate-spin" /> : <SparklesIcon className="size-3.5" />}
                {loading ? t("notebookAi.generating") : t("notebookAi.generate")}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
