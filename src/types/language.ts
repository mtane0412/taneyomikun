/**
 * 言語設定関連の型定義
 * 対応言語とvoice IDのマッピングを管理
 */

export type Language = 'ja' | 'en'

export interface LanguageOption {
  code: Language
  name: string
  voiceId: string
}

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  {
    code: 'ja',
    name: '日本語',
    voiceId: 'fb25b315-dfba-444f-b99d-4c8535672cb7',
  },
  {
    code: 'en',
    name: 'English',
    voiceId: '6064bbbb-72de-437a-9a6e-aca16d123e02',
  },
] as const

export const DEFAULT_LANGUAGE: Language = 'ja'

export function getLanguageOption(code: Language): LanguageOption {
  const option = LANGUAGE_OPTIONS.find((opt) => opt.code === code)
  if (!option) {
    // デフォルトの日本語を返す
    return LANGUAGE_OPTIONS[0]
  }
  return option
}
