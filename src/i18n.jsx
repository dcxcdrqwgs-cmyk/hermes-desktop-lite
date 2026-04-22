import { createContext, useContext, useState } from 'react'
import zh from './locales/zh.json'
import en from './locales/en.json'
import zhTW from './locales/zh-tw.json'

const translations = { zh, en, 'zh-TW': zhTW }
export const DEFAULT_LANGUAGE = 'zh'
export const LANGUAGE_OPTIONS = [
  {
    id: 'zh',
    label: '中文',
    nativeLabel: '简体中文',
    shortLabel: '中',
    description: '界面与提示以中文展示',
  },
  {
    id: 'en',
    label: 'English',
    nativeLabel: 'English',
    shortLabel: 'EN',
    description: 'Interface labels in English',
  },
  {
    id: 'zh-TW',
    label: '繁中',
    nativeLabel: '繁體中文',
    shortLabel: '繁',
    description: '介面與提示以繁體中文顯示',
  },
]

const I18nContext = createContext()

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(DEFAULT_LANGUAGE)

  const interpolate = (value, params = {}) =>
    Object.entries(params).reduce(
      (current, [paramKey, paramValue]) =>
        current.replaceAll(`{${paramKey}}`, String(paramValue)),
      value
    )

  const lookup = (language, key) => {
    const keys = key.split('.')
    let val = translations[language]
    for (const k of keys) {
      val = val?.[k]
    }
    return val
  }

  const t = (key, params) => {
    const value = lookup(lang, key) ?? lookup(DEFAULT_LANGUAGE, key) ?? key
    return typeof value === 'string' ? interpolate(value, params) : value
  }

  return (
    <I18nContext.Provider
      value={{
        t,
        lang,
        setLang,
        languages: LANGUAGE_OPTIONS.map((option) => option.id),
        languageOptions: LANGUAGE_OPTIONS,
      }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
