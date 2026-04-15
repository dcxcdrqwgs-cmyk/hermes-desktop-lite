import { useState } from 'react'
import { SKILLS_FEATURED, SKILLS_OPTIONAL } from './data'

const CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'software-development', label: '开发' },
  { id: 'productivity', label: '办公' },
  { id: 'github', label: 'GitHub' },
  { id: 'research', label: '研究' },
  { id: 'media', label: '媒体' },
  { id: 'apple', label: 'Apple' },
  { id: 'local', label: '本地' },
]

export default function SkillsView() {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('all')
  const [tab, setTab] = useState('installed') // 'installed' | 'market'
  const [selectedSkill, setSelectedSkill] = useState(null) // 详情弹窗
  const [enabledSkills, setEnabledSkills] = useState(new Set(['plan', 'claude-code', 'whisper']))

  const all = [...SKILLS_FEATURED, ...SKILLS_OPTIONAL]

  const filtered = all.filter(s => {
    const matchCat = cat === 'all' || s.category === cat
    const matchQ = !query || s.name.includes(query) || s.desc_zh.includes(query) || s.desc_en.toLowerCase().includes(query.toLowerCase())
    return matchCat && matchQ
  })

  const toggleSkill = (name) => {
    setEnabledSkills(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-8 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>技能</h2>
          {/* Tab: 已安装 / 市场 */}
          <div className="flex rounded-md overflow-hidden"
            style={{ background: 'var(--bg-btn)', border: '1px solid var(--border)' }}>
            {[['installed', '已安装'], ['market', '市场']].map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)}
                className="px-3 py-1 text-xs mono transition-colors"
                style={{
                  background: tab === t ? 'var(--nav-active-bg)' : 'transparent',
                  color: tab === t ? 'var(--text)' : 'var(--text-dim)',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 搜索 */}
        <div className="relative mb-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-dim)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={query} onChange={e => setQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-md mono text-sm outline-none"
            style={{ background: 'var(--bg-btn)', border: '1px solid var(--border)', color: 'var(--text)' }}
            placeholder={tab === 'market' ? '搜索 agentskills.io 市场...' : '搜索已安装技能...'} />
        </div>

        {/* 分类标签 */}
        {tab === 'installed' && (
          <div className="flex gap-1 flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCat(c.id)}
                className="mono px-2.5 py-1 rounded text-xs transition-colors"
                style={{
                  background: cat === c.id ? 'var(--nav-active-bg)' : 'transparent',
                  color: cat === c.id ? 'var(--text)' : 'var(--text-dim)',
                  border: `1px solid ${cat === c.id ? 'var(--border-focus)' : 'var(--border)'}`,
                }}>
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'installed' ? (
          <>
            {/* 已安装 */}
            {cat === 'all' && !query && (
              <div className="mb-6">
                <div className="mono text-[11px] tracking-widest uppercase mb-3" style={{ color: 'var(--text-faint)' }}>
                  高频推荐
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {SKILLS_FEATURED.map(s => (
                    <SkillCard
                      key={s.name}
                      skill={s}
                      enabled={enabledSkills.has(s.name)}
                      onToggle={() => toggleSkill(s.name)}
                      onClick={() => setSelectedSkill(s)}
                    />
                  ))}
                </div>
              </div>
            )}
            {(cat !== 'all' || query) && (
              <div className="grid grid-cols-3 gap-2">
                {filtered.length === 0
                  ? <div className="col-span-3 text-sm py-8 text-center" style={{ color: 'var(--text-dim)' }}>无结果</div>
                  : filtered.map(s => (
                    <SkillCard
                      key={s.name}
                      skill={s}
                      enabled={enabledSkills.has(s.name)}
                      onToggle={() => toggleSkill(s.name)}
                      onClick={() => setSelectedSkill(s)}
                    />
                  ))
                }
              </div>
            )}
          </>
        ) : (
          <>
            {/* 市场浏览 */}
            <MarketPlace query={query} />
          </>
        )}
      </div>

      {/* 详情弹窗 */}
      {selectedSkill && (
        <SkillDetailModal
          skill={selectedSkill}
          tab={tab}
          enabled={enabledSkills.has(selectedSkill.name)}
          onToggle={() => toggleSkill(selectedSkill.name)}
          onClose={() => setSelectedSkill(null)}
        />
      )}
    </div>
  )
}

function SkillCard({ skill, enabled, onToggle, onClick }) {
  return (
    <div className="p-3 rounded-lg transition-all"
      style={{ background: 'var(--bg-card)', border: `1px solid ${enabled ? 'var(--border-focus)' : 'var(--border)'}` }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-focus)'; e.currentTarget.style.background = 'var(--bg-card-hover)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = enabled ? 'var(--border-focus)' : 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)' }}>
      <div className="flex items-start justify-between mb-1">
        <div className="mono text-xs font-medium truncate flex-1" style={{ color: 'var(--text)' }}>{skill.name}</div>
        {/* 启用开关 */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle() }}
          className="w-7 h-4 rounded-full flex-shrink-0 flex items-center px-0.5 transition-colors"
          style={{ background: enabled ? '#3b82f6' : 'var(--bg-btn)' }}>
          <div className="w-3 h-3 rounded-full bg-white transition-transform"
            style={{ transform: enabled ? 'translateX(14px)' : 'translateX(0)' }} />
        </button>
      </div>
      <div className="text-xs truncate" style={{ color: 'var(--text-dim)' }}>{skill.desc_zh}</div>
      <div className="flex items-center gap-2 mt-2">
        <span className="mono text-[10px] px-1.5 py-0.5 rounded"
          style={{ background: 'var(--bg-btn)', color: 'var(--text-faint)' }}>
          {skill.category}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onClick() }}
          className="mono text-[10px] px-1.5 py-0.5 rounded"
          style={{ background: 'var(--bg-btn)', color: 'var(--text-dim)' }}>
          详情 →
        </button>
      </div>
    </div>
  )
}

function SkillDetailModal({ skill, tab, enabled, onToggle, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-lg rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <div className="mono text-sm font-semibold" style={{ color: 'var(--text)' }}>{skill.name}</div>
            <div className="mono text-[11px] mt-0.5" style={{ color: 'var(--text-faint)' }}>{skill.category}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md"
            style={{ color: 'var(--text-dim)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-btn)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <div className="text-xs mb-1.5" style={{ color: 'var(--text-faint)' }}>中文说明</div>
            <p className="text-sm" style={{ color: 'var(--text)' }}>{skill.desc_zh}</p>
          </div>
          <div>
            <div className="text-xs mb-1.5" style={{ color: 'var(--text-faint)' }}>English</div>
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>{skill.desc_en}</p>
          </div>
          {skill.commands && skill.commands.length > 0 && (
            <div>
              <div className="text-xs mb-1.5" style={{ color: 'var(--text-faint)' }}>可用命令</div>
              <div className="flex gap-1.5 flex-wrap">
                {skill.commands.map(cmd => (
                  <span key={cmd} className="mono text-xs px-2 py-1 rounded"
                    style={{ background: 'var(--bg-btn)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    {cmd}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-dim)' }}>启用状态</span>
            <button
              onClick={onToggle}
              className="w-9 h-5 rounded-full flex items-center px-0.5 transition-colors"
              style={{ background: enabled ? '#3b82f6' : 'var(--bg-btn)' }}>
              <div className="w-4 h-4 rounded-full bg-white transition-transform"
                style={{ transform: enabled ? 'translateX(16px)' : 'translateX(0)' }} />
            </button>
            <span className="text-xs mono" style={{ color: enabled ? '#3b82f6' : 'var(--text-dim)' }}>
              {enabled ? '已启用' : '已禁用'}
            </span>
          </div>
          {tab !== 'market' && (
            <button
              className="mono text-xs px-3 py-1.5 rounded"
              style={{ background: '#3b82f6', color: '#fff' }}>
              市場で検索
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function MarketPlace({ query }) {
  // 模拟市场数据（实际应从 agentskills.io API 获取）
  const MARKET_SKILLS = [
    { name: 'linear', category: 'productivity', desc_zh: 'Linear 项目管理集成', desc_en: 'Linear project management integration', source: 'agentskills.io' },
    { name: 'notion', category: 'productivity', desc_zh: 'Notion 笔记和数据库', desc_en: 'Notion notes and database', source: 'agentskills.io' },
    { name: 'google-workspace', category: 'productivity', desc_zh: 'Gmail, Calendar, Drive 集成', desc_en: 'Gmail, Calendar, Drive integration', source: 'agentskills.io' },
    { name: 'xitter', category: 'social-media', desc_zh: 'X/Twitter 社交平台交互', desc_en: 'X/Twitter social platform interaction', source: 'agentskills.io' },
    { name: 'heartmula', category: 'media', desc_zh: 'AI 音乐生成工具', desc_en: 'AI music generation tool', source: 'agentskills.io' },
    { name: 'manim-video', category: 'creative', desc_zh: '数学视频动画生成', desc_en: 'Mathematical video animation', source: 'agentskills.io' },
    { name: 'jmte', category: 'media', desc_zh: 'Jina Markdown 表格提取', desc_en: 'Jina Markdown Table Extractor', source: 'agentskills.io' },
    { name: 'openhue', category: 'smart-home', desc_zh: '飞利浦 Hue 智能灯光控制', desc_en: 'Philips Hue smart lighting control', source: 'agentskills.io' },
    { name: 'findmy', category: 'apple', desc_zh: 'Apple FindMy 设备追踪', desc_en: 'Apple FindMy device tracking', source: 'agentskills.io' },
    { name: 'modal', category: 'mlops', desc_zh: 'Modal GPU 云端计算', desc_en: 'Modal GPU cloud computing', source: 'agentskills.io' },
  ]

  const filtered = MARKET_SKILLS.filter(s => {
    const matchQ = !query || s.name.includes(query) || s.desc_zh.includes(query) || s.desc_en.toLowerCase().includes(query.toLowerCase())
    return matchQ
  })

  if (filtered.length === 0) {
    return (
      <div className="text-sm py-8 text-center" style={{ color: 'var(--text-dim)' }}>
        {query ? '无匹配技能' : '正在加载市场...'}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="mono text-[11px] tracking-widest uppercase mb-3" style={{ color: 'var(--text-faint)' }}>
        agentskills.io 市场
      </div>
      <div className="grid grid-cols-2 gap-2">
        {filtered.map(s => (
          <div key={s.name} className="p-3 rounded-lg"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="mono text-xs font-medium" style={{ color: 'var(--text)' }}>{s.name}</span>
              <span className="mono text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: 'var(--bg-btn)', color: 'var(--text-faint)' }}>
                {s.source}
              </span>
            </div>
            <p className="text-xs mb-2" style={{ color: 'var(--text-dim)' }}>{s.desc_zh}</p>
            <button
              className="w-full mono text-xs py-1 rounded transition-colors"
              style={{ background: 'var(--bg-btn)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-btn)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
              + 安装
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
