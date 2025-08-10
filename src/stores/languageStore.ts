/**
 * 言語設定の状態管理Store
 * 選択された言語を管理し、voice IDを提供する
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  Language,
  DEFAULT_LANGUAGE,
  getLanguageOption,
} from '../types/language'

interface LanguageState {
  language: Language
  setLanguage: (language: Language) => void
  getVoiceId: () => string
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: DEFAULT_LANGUAGE,
      setLanguage: (language) => set({ language }),
      getVoiceId: () => {
        const state = get()
        return getLanguageOption(state.language).voiceId
      },
    }),
    {
      name: 'language-storage',
    },
  ),
)
