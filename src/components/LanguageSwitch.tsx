/**
 * 言語切り替えスイッチコンポーネント
 * 国旗アイコンを使用した言語選択UI
 */

import React from 'react'
import { useLanguageStore } from '../stores/languageStore'
import { LANGUAGE_OPTIONS, Language } from '../types/language'

const FlagIcon: React.FC<{ language: Language }> = ({ language }) => {
  const flags: Record<Language, string> = {
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

  return (
    <span className="flag-icon" role="img" aria-label={language}>
      {flags[language]}
    </span>
  )
}

export const LanguageSwitch: React.FC = () => {
  const { language, setLanguage } = useLanguageStore()

  const currentIndex = LANGUAGE_OPTIONS.findIndex(
    (opt) => opt.code === language,
  )

  const handleSwitch = () => {
    const nextIndex = (currentIndex + 1) % LANGUAGE_OPTIONS.length
    setLanguage(LANGUAGE_OPTIONS[nextIndex].code as Language)
  }

  const currentOption = LANGUAGE_OPTIONS[currentIndex]

  return (
    <div className="language-switch-container">
      <button
        className="language-switch"
        onClick={handleSwitch}
        aria-label={`現在の言語: ${currentOption.name}. クリックして切り替え`}
      >
        <div className="language-switch-track">
          <div className="language-switch-options">
            {LANGUAGE_OPTIONS.map((option, index) => (
              <div
                key={option.code}
                className={`language-option ${
                  index === currentIndex ? 'active' : ''
                }`}
                style={{
                  transform: `translateX(${(index - currentIndex) * 100}%)`,
                }}
              >
                <FlagIcon language={option.code as Language} />
                <span className="language-name">{option.name}</span>
              </div>
            ))}
          </div>
        </div>
      </button>
      <div className="language-hint">{currentOption.name}で読み上げます</div>
    </div>
  )
}
