/**
 * 言語フラグコンポーネント
 * 国旗アイコンのみ表示のシンプルな言語切り替え
 */
import { useState, useRef, useEffect } from 'react'
import { useLanguageStore } from '../stores/languageStore'
import { LANGUAGE_OPTIONS, Language } from '../types/language'

const FLAGS: Record<Language, string> = {
  ja: '🇯🇵',
  en: '🇺🇸',
  zh: '🇨🇳',
  ko: '🇰🇷',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇵🇹',
  ru: '🇷🇺',
}

export function LanguageFlag() {
  const { language, setLanguage } = useLanguageStore()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showMenu])

  const currentOption = LANGUAGE_OPTIONS.find((opt) => opt.code === language)!

  return (
    <div className="language-flag-container" ref={menuRef}>
      <button
        className="btn btn-secondary icon-btn flag-btn"
        onClick={() => setShowMenu(!showMenu)}
        title={`言語: ${currentOption.name}`}
      >
        <span className="flag-icon" role="img" aria-label={currentOption.name}>
          {FLAGS[language]}
        </span>
      </button>
      {showMenu && (
        <div className="language-menu popover">
          <div className="language-menu-content">
            {LANGUAGE_OPTIONS.map((option) => (
              <button
                key={option.code}
                className={`language-menu-item ${
                  option.code === language ? 'active' : ''
                }`}
                onClick={() => {
                  setLanguage(option.code as Language)
                  setShowMenu(false)
                }}
              >
                <span className="flag-icon" role="img" aria-label={option.name}>
                  {FLAGS[option.code as Language]}
                </span>
                <span className="language-name">{option.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
