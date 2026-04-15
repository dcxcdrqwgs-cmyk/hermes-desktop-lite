import { createContext, useContext, useState } from 'react'
import zh from './locales/zh.json'
import en from './locales/en.json'

const translations = { zh, en }

const I18nContext = createContext()

export function I18nProvider({ children }) {
  const [lang, setLang] = useState('zh')

  const t = (key) => {
    const keys = key.split('.')
    let val = translations[lang]
    for (const k of keys) {
      val = val?.[k]
    }
    return val ?? key
  }

  return (
    <I18nContext.Provider value={{ t, lang, setLang, languages: ['zh', 'en'] }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
