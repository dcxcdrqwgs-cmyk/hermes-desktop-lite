import { useState, useEffect } from 'react'
import { getTasks, createTask, updateTask, deleteTask } from './api'

const STATUS_CONFIG = {
  in_progress: { label: '🟡 进行中', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  completed:    { label: '🟢 已完成', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  expired:      { label: '🔴 已过期', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
}

export default function TaskView() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'in_progress' | 'completed' | 'expired'
  const [showAdd, setShowAdd] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', due_date: '' })

  const load = async () => {
    try {
      const data = await getTasks()
      setTasks(data)
    } catch (e) {
      console.error('加载任务失败', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleToggle = async (task) => {
    const newStatus = task.status === 'completed' ? 'in_progress' : 'completed'
    try {
      await updateTask(task.id, newStatus)
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
    } catch (e) {
      console.error('更新状态失败', e)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteTask(id)
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch (e) {
      console.error('删除失败', e)
    }
  }

  const handleAdd = async () => {
    if (!newTask.title.trim()) return
    try {
      const task = await createTask(newTask.title, newTask.description, newTask.due_date || null)
      setTasks(prev => [...prev, task])
      setNewTask({ title: '', description: '', due_date: '' })
      setShowAdd(false)
    } catch (e) {
      console.error('创建任务失败', e)
    }
  }

  // 过滤
  const filtered = tasks.filter(t => filter === 'all' || t.status === filter)

  // 统计
  const counts = tasks.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, { in_progress: 0, completed: 0, expired: 0 })

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-8 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>任务</h2>
          <button
            onClick={() => setShowAdd(true)}
            className="mono px-2.5 py-1 rounded text-xs transition-colors"
            style={{
              background: 'var(--bg-btn)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
            }}>
            + 新建任务
          </button>
        </div>

        {/* 状态统计 */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setFilter(filter === key ? 'all' : key)}
              className="p-3 rounded-lg text-center transition-all"
              style={{
                background: filter === key ? cfg.bg : 'var(--bg-card)',
                border: `1px solid ${filter === key ? cfg.color + '60' : 'var(--border)'}`,
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

        {/* 筛选标签 */}
        <div className="flex gap-1 flex-wrap">
          {['all', 'in_progress', 'completed', 'expired'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="mono px-2.5 py-1 rounded text-xs transition-colors"
              style={{
                background: filter === f ? 'var(--nav-active-bg)' : 'transparent',
                color: filter === f ? 'var(--text)' : 'var(--text-dim)',
                border: `1px solid ${filter === f ? 'var(--border-focus)' : 'var(--border)'}`,
              }}>
              {f === 'all' ? '全部' : STATUS_CONFIG[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      {/* 任务列表 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {loading ? (
          <div className="text-sm py-8 text-center" style={{ color: 'var(--text-dim)' }}>
            加载中...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm py-8 text-center" style={{ color: 'var(--text-dim)' }}>
            暂无任务
          </div>
        ) : filtered.map(task => {
          const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.in_progress
          return (
            <div key={task.id} className="p-4 rounded-lg"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-start gap-3">
                {/* 复选框 */}
                <button
                  onClick={() => handleToggle(task)}
                  className="mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-colors"
                  style={{
                    background: task.status === 'completed' ? cfg.color : 'transparent',
                    border: `2px solid ${task.status === 'completed' ? cfg.color : 'var(--border)'}`,
                  }}>
                  {task.status === 'completed' && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-sm font-medium ${task.status === 'completed' ? 'line-through' : ''}`}
                      style={{ color: task.status === 'completed' ? 'var(--text-dim)' : 'var(--text)' }}>
                      {task.title}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-sm mb-2" style={{ color: 'var(--text-dim)' }}>
                      {task.description}
                    </p>
                  )}
                  {task.due_date && (
                    <div className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                        style={{ color: 'var(--text-faint)' }}>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <span className="mono text-[11px]" style={{ color: 'var(--text-faint)' }}>
                        {task.due_date}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(task.id)}
                  className="p-1.5 rounded flex-shrink-0"
                  style={{ color: 'var(--text-dim)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.background = 'transparent' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* 新建任务弹窗 */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md p-5 rounded-xl"
            style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>新建任务</h3>
            <input
              value={newTask.title}
              onChange={e => setNewTask(f => ({ ...f, title: e.target.value }))}
              className="w-full mb-3 px-3 py-2 rounded-md mono text-sm outline-none"
              style={{ background: 'var(--bg-btn)', border: '1px solid var(--border)', color: 'var(--text)' }}
              placeholder="任务标题（必填）"
              autoFocus
            />
            <textarea
              value={newTask.description}
              onChange={e => setNewTask(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full mb-3 px-3 py-2 rounded-md mono text-sm outline-none resize-none"
              style={{ background: 'var(--bg-btn)', border: '1px solid var(--border)', color: 'var(--text)' }}
              placeholder="任务描述（可选）"
            />
            <div className="mb-4">
              <label className="block text-xs mb-1" style={{ color: 'var(--text-dim)' }}>截止日期（可选）</label>
              <input
                type="date"
                value={newTask.due_date}
                onChange={e => setNewTask(f => ({ ...f, due_date: e.target.value }))}
                className="w-full px-3 py-2 rounded-md mono text-sm outline-none"
                style={{ background: 'var(--bg-btn)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowAdd(false); setNewTask({ title: '', description: '', due_date: '' }) }}
                className="px-3 py-1.5 rounded text-xs"
                style={{ color: 'var(--text-dim)', background: 'var(--bg-btn)' }}>
                取消
              </button>
              <button onClick={handleAdd}
                className="px-3 py-1.5 rounded text-xs"
                style={{ color: '#fff', background: '#3b82f6' }}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
