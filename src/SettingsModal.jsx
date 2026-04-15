import { useEffect, useState } from 'react'
import { getConfig, setConfig } from './api'
import { useI18n } from './i18n'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function SettingsModal({ onClose }) {
  const { t, lang, setLang } = useI18n()
  const [theme, setTheme] = useState('dark')
  const [language, setLanguage] = useState(lang)
  const [agent, setAgent] = useState('hermes-agent')
  const [saving, setSaving] = useState(false)

  // 加载已有配置
  useEffect(() => {
    getConfig().then(cfg => {
      setTheme(cfg.theme)
      setLanguage(cfg.language)
      setAgent(cfg.current_agent || 'hermes-agent')
    }).catch(console.error)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      setLang(language)
      await setConfig('theme', theme)
      await setConfig('language', language)
      await setConfig('agent', agent)
      onClose()
    } catch (e) {
      console.error('Save failed', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">

          {/* Theme */}
          <div>
            <div className="text-xs mb-2 font-medium text-muted-foreground">{t('settings.appearance')}</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'light', label: t('settings.light'), icon: '☀️' },
                { id: 'dark', label: t('settings.dark'), icon: '🌙' },
                { id: 'system', label: t('settings.system'), icon: '🔄' },
              ].map(t_theme => (
                <button
                  key={t_theme.id}
                  onClick={() => setTheme(t_theme.id)}
                  className={cn(
                    "p-3 rounded-lg text-center transition-all border text-sm",
                    theme === t_theme.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  )}
                >
                  <div className="text-lg mb-1">{t_theme.icon}</div>
                  <div className="text-[11px] font-medium">{t_theme.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <div className="text-xs mb-2 font-medium text-muted-foreground">{t('settings.language')}</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'zh', label: '中文', flag: '🇨🇳' },
                { id: 'en', label: 'English', flag: '🇺🇸' },
              ].map(l => (
                <button
                  key={l.id}
                  onClick={() => setLanguage(l.id)}
                  className={cn(
                    "p-3 rounded-lg text-center transition-all border text-sm",
                    language === l.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  )}
                >
                  <div className="text-lg mb-1">{l.flag}</div>
                  <div className="text-[11px] font-medium">{l.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Agent */}
          <div>
            <div className="text-xs mb-2 font-medium text-muted-foreground">{t('settings.agent')}</div>
            <div className="space-y-1.5">
              {[
                { id: 'hermes-agent', label: 'Hermes Agent', desc: 'Default agent' },
                { id: 'dev', label: 'Dev Agent', desc: 'Developer mode' },
                { id: 'data-expert', label: 'Data Expert', desc: 'Data analysis expert' },
              ].map(a => (
                <button
                  key={a.id}
                  onClick={() => setAgent(a.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all border text-sm",
                    agent === a.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-muted"
                  )}
                >
                  <div>
                    <div className="text-xs font-medium" style={{ color: agent === a.id ? 'var(--primary)' : 'var(--foreground)' }}>{a.label}</div>
                    <div className="text-[11px] text-muted-foreground">{a.desc}</div>
                  </div>
                  {agent === a.id && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Connection */}
          <div>
            <div className="text-xs mb-2 font-medium text-muted-foreground">{t('settings.connection')}</div>
            <div className="p-3 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="mono text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t('settings.connected')}
                </span>
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
                  <span style={{ color: 'var(--text-faint)' }}>API:</span> {t('settings.api')}
                </div>
                <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
                  <span style={{ color: 'var(--text-faint)' }}>{t('settings.model')}:</span> hermes-agent
                </div>
              </div>
            </div>
          </div>

          {/* Version */}
          <div className="text-center">
            <span className="mono text-[11px]" style={{ color: 'var(--text-faint)' }}>
              {t('settings.version')}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {t('settings.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? t('settings.saving') : t('settings.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
