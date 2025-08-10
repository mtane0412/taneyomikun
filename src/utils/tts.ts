/**
 * TTSユーティリティ関数
 * Tauriバックエンドとの通信を管理する
 */

import { invoke } from '@tauri-apps/api/core'

export interface TTSConfig {
  model_id: string
  voice_id: string
  speed: number
  volume: number
  language: string
  voice_speed: number
}

export async function setApiKey(apiKey: string): Promise<void> {
  await invoke('set_api_key', { apiKey })
}

export async function checkApiKey(): Promise<boolean> {
  return await invoke('check_api_key')
}

export async function removeApiKey(): Promise<void> {
  await invoke('remove_api_key')
}

export async function updateTTSConfig(
  config: Partial<TTSConfig>,
): Promise<void> {
  await invoke('update_tts_config', {
    modelId: config.model_id,
    voiceId: config.voice_id,
    speed: config.speed,
    volume: config.volume,
    language: config.language,
    voiceSpeed: config.voice_speed,
  })
}

export async function getTTSConfig(): Promise<TTSConfig> {
  return await invoke('get_tts_config')
}

export async function synthesizeSpeech(text: string): Promise<void> {
  await invoke('synthesize_speech', { text })
}

export async function stopSpeech(): Promise<void> {
  await invoke('stop_speech')
}
