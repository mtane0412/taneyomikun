/**
 * TTS関連のTauriコマンド
 * 音声合成、設定管理、音声リスト取得などのコマンドを提供
 */

use crate::tts::{CartesiaClient, ConfigManager, TTSConfig};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceInfo {
    pub id: String,
    pub name: String,
    pub language: String,
}
use tauri::State;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct AudioState {
    pub is_playing: Arc<Mutex<bool>>,
}

#[tauri::command]
pub async fn save_api_key(api_key: String) -> Result<(), String> {
    ConfigManager::save_api_key(&api_key)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn check_api_key() -> Result<bool, String> {
    match ConfigManager::get_api_key() {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
pub async fn delete_api_key() -> Result<(), String> {
    ConfigManager::delete_api_key()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_voices() -> Result<Vec<VoiceInfo>, String> {
    CartesiaClient::get_voices()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn synthesize_text(
    text: String,
    config: TTSConfig,
    state: State<'_, AudioState>,
) -> Result<(), String> {
    let client = CartesiaClient::new_with_config(config)
        .await
        .map_err(|e| e.to_string())?;

    let is_playing = state.is_playing.clone();
    *is_playing.lock().await = true;

    let result = client
        .synthesize_stream(&text, |audio_chunk| {
            // TODO: 実際の音声再生処理を実装
            // 現在はプレースホルダー
            println!("Audio chunk received: {} bytes", audio_chunk.len());
            Ok(())
        })
        .await;

    *is_playing.lock().await = false;

    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stop_synthesis(state: State<'_, AudioState>) -> Result<(), String> {
    let is_playing = state.is_playing.clone();
    *is_playing.lock().await = false;
    
    // TODO: 実際の停止処理を実装
    Ok(())
}