/**
 * TTS関連のTauriコマンド
 * フロントエンドからのTTSリクエストを処理する
 */

use crate::tts::{config::ApiKeyManager, TTSConfig};
use tauri::State;
use tokio::sync::Mutex;
use std::sync::Arc;

pub struct TTSState {
    pub config: Arc<Mutex<TTSConfig>>,
}

impl Default for TTSState {
    fn default() -> Self {
        Self {
            config: Arc::new(Mutex::new(TTSConfig::default())),
        }
    }
}

#[tauri::command]
pub async fn set_api_key(api_key: String) -> Result<(), String> {
    ApiKeyManager::save_api_key(&api_key)
        .map_err(|e| format!("APIキーの保存に失敗しました: {}", e))
}

#[tauri::command]
pub async fn check_api_key() -> Result<bool, String> {
    Ok(ApiKeyManager::has_api_key())
}

#[tauri::command]
pub async fn remove_api_key() -> Result<(), String> {
    ApiKeyManager::delete_api_key()
        .map_err(|e| format!("APIキーの削除に失敗しました: {}", e))
}

#[tauri::command]
pub async fn update_tts_config(
    state: State<'_, TTSState>,
    voice_id: Option<String>,
    speed: Option<f32>,
    volume: Option<f32>,
    language: Option<String>,
) -> Result<(), String> {
    let mut config = state.config.lock().await;
    
    if let Some(voice_id) = voice_id {
        config.voice_id = voice_id;
    }
    if let Some(speed) = speed {
        config.speed = speed.clamp(0.5, 2.0);
    }
    if let Some(volume) = volume {
        config.volume = volume.clamp(0.0, 1.0);
    }
    if let Some(language) = language {
        config.language = language;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn get_tts_config(state: State<'_, TTSState>) -> Result<TTSConfig, String> {
    let config = state.config.lock().await;
    Ok(config.clone())
}

#[tauri::command]
pub async fn synthesize_speech(
    state: State<'_, TTSState>,
    _text: String,
) -> Result<(), String> {
    let _config = state.config.lock().await.clone();
    
    // TODO: 実際の音声合成処理を実装
    // 現在は基本的な構造のみ
    
    Ok(())
}