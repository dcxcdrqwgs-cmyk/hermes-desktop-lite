import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

export function Popup({ items, onSelect, onClose, renderItem, filterFn, query, onQueryChange }) {
  const [idx, setIdx] = useState(0)
  const listRef = useRef(null)

  const filtered = query ? items.filter(i => filterFn(i, query)) : items

  useEffect(() => { setIdx(0) }, [query])

  useEffect(() => {
    const el = listRef.current?.children[idx]
    el?.scrollIntoView({ block: 'nearest' })
  }, [idx])

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[idx]) onSelect(filtered[idx]) }
    else if (e.key === 'Escape') onClose()
  }

  return (
    <div className="absolute bottom-full mb-2 left-0 right-0 z-50 rounded-lg border border-border bg-popover shadow-lg overflow-hidden"
         style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
      <div className="border-b border-border">
        <input value={query} onChange={e => onQueryChange(e.target.value)} onKeyDown={handleKey}
          className="w-full px-3 py-2 mono text-sm outline-none bg-transparent text-foreground placeholder:text-muted-foreground"
          placeholder="搜索..." />
      </div>
      <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: '240px' }}>
        {filtered.length === 0
          ? <div className="px-3 py-2 text-sm text-muted-foreground">无结果</div>
          : filtered.map((item, i) => (
              <button key={i} onClick={() => onSelect(item)}
                className={cn(
                  "w-full text-left px-3 py-2 transition-colors text-foreground",
                  i === idx ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                )}
                onMouseEnter={() => setIdx(i)}>
                {renderItem(item)}
              </button>
            ))}
      </div>
    </div>
  )
}
