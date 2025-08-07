/**
 * Tauri APIとの通信を行うユーティリティ関数
 * バックエンドのTTSコマンドを呼び出す
 */

import { invoke } from '@tauri-apps/api/core'

export interface TTSConfig {
  voice_id: string
  speed: number
  volume: number
  language: string
}

export interface VoiceInfo {
  id: string
  name: string
  language: string
}

export const tauriApi = {
  async saveApiKey(apiKey: string): Promise<void> {
    await invoke('save_api_key', { apiKey })
  },

  async checkApiKey(): Promise<boolean> {
    return await invoke('check_api_key')
  },

  async deleteApiKey(): Promise<void> {
    await invoke('delete_api_key')
  },

  async getVoices(): Promise<VoiceInfo[]> {
    return await invoke('get_voices')
  },

  async synthesizeText(text: string, config: TTSConfig): Promise<void> {
    await invoke('synthesize_text', { text, config })
  },

  async stopSynthesis(): Promise<void> {
    await invoke('stop_synthesis')
  },
}
