import { useState, useEffect } from 'react'
import { getMemories, addMemory, updateMemory, deleteMemory, compactMemories } from './api'

const IMPORTANCE_CONFIG = {
  hot:  { label: '🔥 热', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)' },
  warm: { label: '🌡️ 温', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  cold: { label: '❄️ 冷', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.3)' },
}

const SOURCE_LABELS = { '对话': '📝 对话', '手动': '✋ 手动', '配置': '⚙️ 配置', 'skills': '🛠️ 技能' }

export default function MemoryView() {
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'hot' | 'warm' | 'cold'
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ summary: '', content: '' })
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ summary: '', content: '' })
  const [compacting, setCompacting] = useState(false)

  // 加载记忆
  const load = async () => {
    try {
      const data = await getMemories()
      setMemories(data)
    } catch (e) {
      console.error('加载记忆失败', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // 按重要性分组统计
  const counts = memories.reduce((acc, m) => {
    acc[m.importance] = (acc[m.importance] || 0) + 1
    return acc
  }, { hot: 0, warm: 0, cold: 0 })

  // 过滤
  const filtered = memories.filter(m => {
    const matchFilter = filter === 'all' || m.importance === filter
    const matchQ = !query || m.summary.includes(query) || m.content.includes(query)
    return matchFilter && matchQ
  })

  // 整合
  const handleCompact = async () => {
    setCompacting(true)
    try {
      const msg = await compactMemories()
      await load()
      console.log(msg)
    } catch (e) {
      console.error('整合失败', e)
    } finally {
      setCompacting(false)
    }
  }

  // 删除
  const handleDelete = async (id) => {
    try {
      await deleteMemory(id)
      setMemories(prev => prev.filter(m => m.id !== id))
    } catch (e) {
      console.error('删除失败', e)
    }
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    try {
      await updateMemory(editingId, editForm.summary, editForm.content)
      setMemories(prev => prev.map(m =>
        m.id === editingId ? { ...m, summary: editForm.summary, content: editForm.content } : m
      ))
      setEditingId(null)
    } catch (e) {
      console.error('保存失败', e)
    }
  }

  // 新增
  const handleAdd = async () => {
    if (!addForm.summary.trim()) return
    try {
      const entry = await addMemory(addForm.summary, addForm.content, '手动')
      setMemories(prev => [...prev, entry])
      setAddForm({ summary: '', content: '' })
      setShowAdd(false)
    } catch (e) {
      console.error('添加失败', e)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-8 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>记忆</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCompact}
              disabled={compacting}
              className="mono px-2.5 py-1 rounded text-xs transition-colors"
              style={{
                background: 'var(--bg-btn)',
                border: '1px solid var(--border)',
                color: compacting ? 'var(--text-dim)' : 'var(--text-muted)',
              }}>
              {compacting ? '整合中...' : '🗜️ 整合'}
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="mono px-2.5 py-1 rounded text-xs transition-colors"
              style={{
                background: 'var(--bg-btn)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
              }}>
              + 添加
            </button>
          </div>
        </div>

        {/* 重要性统计卡片 */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {Object.entries(IMPORTANCE_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setFilter(filter === key ? 'all' : key)}
              className="p-3 rounded-lg text-center transition-all"
              style={{
                background: filter === key ? cfg.bg : 'var(--bg-card)',
                border: `1px solid ${filter === key ? cfg.border : 'var(--border)'}`,
              }}>
              <div className="text-lg font-semibold" style={{ color: cfg.color }}>
                {counts[key] || 0}
              </div>
              <div className="mono text-[11px]" style={{ color: 'var(--text-dim)' }}>
                {cfg.label}
              </div>
            </button>
          ))}
        </div>

        {/* 搜索 */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-dim)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={query} onChange={e => setQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-md mono text-sm outline-none"
            style={{ background: 'var(--bg-btn)', border: '1px solid var(--border)', color: 'var(--text)' }}
            placeholder="搜索记忆..." />
        </div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {loading ? (
          <div className="text-sm py-8 text-center" style={{ color: 'var(--text-dim)' }}>
            加载中...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm py-8 text-center" style={{ color: 'var(--text-dim)' }}>
            无记忆 {query ? '(无匹配结果)' : ''}
          </div>
        ) : filtered.map(m => {
          const cfg = IMPORTANCE_CONFIG[m.importance] || IMPORTANCE_CONFIG.cold
          return (
            <div key={m.id} className="p-4 rounded-lg"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded font-medium"
                    style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                    {cfg.label}
                  </span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{m.summary}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="mono text-[11px]" style={{ color: 'var(--text-faint)' }}>
                    {SOURCE_LABELS[m.source] || m.source}
                  </span>
                  <button
                    onClick={() => { setEditingId(m.id); setEditForm({ summary: m.summary, content: m.content }) }}
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ color: 'var(--text-dim)', background: 'var(--bg-btn)' }}>
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>
                    删除
                  </button>
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>{m.content}</p>
              <div className="mt-2">
                <span className="mono text-[11px]" style={{ color: 'var(--text-faint)' }}>
                  {m.created_at} · 访问 {m.access_count} 次
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 编辑弹窗 */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md p-5 rounded-xl"
            style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>编辑记忆</h3>
            <input
              value={editForm.summary}
              onChange={e => setEditForm(f => ({ ...f, summary: e.target.value }))}
              className="w-full mb-3 px-3 py-2 rounded-md mono text-sm outline-none"
              style={{ background: 'var(--bg-btn)', border: '1px solid var(--border)', color: 'var(--text)' }}
              placeholder="摘要"
            />
            <textarea
              value={editForm.content}
              onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))}
              rows={4}
              className="w-full mb-3 px-3 py-2 rounded-md mono text-sm outline-none resize-none"
              style={{ background: 'var(--bg-btn)', border: '1px solid var(--border)', color: 'var(--text)' }}
              placeholder="完整内容"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditingId(null)}
                className="px-3 py-1.5 rounded text-xs"
                style={{ color: 'var(--text-dim)', background: 'var(--bg-btn)' }}>
                取消
              </button>
              <button onClick={handleSaveEdit}
                className="px-3 py-1.5 rounded text-xs"
                style={{ color: '#fff', background: '#3b82f6' }}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新增弹窗 */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md p-5 rounded-xl"
            style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>添加记忆</h3>
            <input
              value={addForm.summary}
              onChange={e => setAddForm(f => ({ ...f, summary: e.target.value }))}
              className="w-full mb-3 px-3 py-2 rounded-md mono text-sm outline-none"
              style={{ background: 'var(--bg-btn)', border: '1px solid var(--border)', color: 'var(--text)' }}
              placeholder="摘要（必填）"
            />
            <textarea
              value={addForm.content}
              onChange={e => setAddForm(f => ({ ...f, content: e.target.value }))}
              rows={4}
              className="w-full mb-3 px-3 py-2 rounded-md mono text-sm outline-none resize-none"
              style={{ background: 'var(--bg-btn)', border: '1px solid var(--border)', color: 'var(--text)' }}
              placeholder="完整内容"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowAdd(false); setAddForm({ summary: '', content: '' }) }}
                className="px-3 py-1.5 rounded text-xs"
                style={{ color: 'var(--text-dim)', background: 'var(--bg-btn)' }}>
                取消
              </button>
              <button onClick={handleAdd}
                className="px-3 py-1.5 rounded text-xs"
                style={{ color: '#fff', background: '#3b82f6' }}>
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
