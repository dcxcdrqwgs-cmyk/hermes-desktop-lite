import { useEffect, useMemo, useRef, useState } from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

export function Popup({
  items,
  onSelect,
  onClose,
  renderItem,
  filterFn,
  query,
  onQueryChange,
}) {
  const { t } = useI18n()
  const [idx, setIdx] = useState(0)
  const listRef = useRef(null)

  const filtered = useMemo(
    () => (query ? items.filter((item) => filterFn(item, query)) : items),
    [filterFn, items, query]
  )
  const activeIndex = filtered.length === 0 ? -1 : Math.min(idx, filtered.length - 1)

  useEffect(() => {
    const node = listRef.current?.querySelector(`[data-popup-item="${activeIndex}"]`)
    node?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  const handleQueryInput = (value) => {
    setIdx(0)
    onQueryChange(value)
  }

  const handleKey = (event) => {
    if (filtered.length === 0) {
      if (event.key === "Escape") {
        onClose()
      }
      return
    }

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setIdx((current) => Math.min(current + 1, filtered.length - 1))
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setIdx((current) => Math.max(current - 1, 0))
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      if (activeIndex >= 0 && filtered[activeIndex]) {
        onSelect(filtered[activeIndex])
      }
      return
    }

    if (event.key === "Escape") {
      onClose()
    }
  }

  return (
    <div className="app-panel-strong absolute inset-x-0 bottom-full z-50 mb-3 overflow-hidden rounded-[1.35rem]">
      <div className="border-b border-border/70 px-3 py-3">
        <input
          autoFocus
          value={query}
          onChange={(event) => handleQueryInput(event.target.value)}
          onKeyDown={handleKey}
          className="mono h-10 w-full rounded-xl border border-border/80 bg-background/70 px-3 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          placeholder={t("popup.continueFilter")}
        />
      </div>

      <ScrollArea className="max-h-64">
        <div ref={listRef} className="p-2">
          {filtered.length === 0 ? (
            <div className="rounded-2xl px-3 py-8 text-center text-sm text-muted-foreground">
              {t("popup.noMatches")}
            </div>
          ) : (
            filtered.map((item, itemIndex) => (
              <button
                key={`${itemIndex}-${query}`}
                data-popup-item={itemIndex}
                onClick={() => onSelect(item)}
                onMouseEnter={() => setIdx(itemIndex)}
                className={cn(
                  "w-full rounded-2xl px-3 py-3 text-left transition-colors",
                  itemIndex === activeIndex
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-muted/80"
                )}>
                {renderItem(item)}
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
