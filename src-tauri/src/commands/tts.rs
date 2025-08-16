/**
 * TTS関連のTauriコマンド
 * フロントエンドからのTTSリクエストを処理する
 */

use crate::tts::{
    client::CartesiaClient,
    config::ApiKeyManager,
    storage::ApiKeyStorage,
    TTSConfig
};
use crate::audio::manager::AudioManager;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::{Mutex, mpsc, oneshot};
use std::sync::Arc;
use log::info;

pub struct TTSState {
    pub config: Arc<Mutex<TTSConfig>>,
    pub is_synthesizing: Arc<Mutex<bool>>,
    pub api_key: Arc<Mutex<Option<String>>>,
    pub cancel_tx: Arc<Mutex<Option<oneshot::Sender<()>>>>,
    pub audio_manager: Arc<Mutex<Option<AudioManager>>>,
}

impl Default for TTSState {
    fn default() -> Self {
        Self {
            config: Arc::new(Mutex::new(TTSConfig::default())),
            is_synthesizing: Arc::new(Mutex::new(false)),
            api_key: Arc::new(Mutex::new(None)),
            cancel_tx: Arc::new(Mutex::new(None)),
            audio_manager: Arc::new(Mutex::new(None)),
        }
    }
}

#[tauri::command]
pub async fn set_api_key(state: State<'_, TTSState>, api_key: String) -> Result<(), String> {
    eprintln!("Setting API key...");
    // メモリに保存
    let mut stored_key = state.api_key.lock().await;
    *stored_key = Some(api_key.clone());
    eprintln!("API key saved to memory");
    
    // ファイルに保存
    if let Err(e) = ApiKeyStorage::save_api_key(&api_key) {
        eprintln!("Failed to save API key to file: {}", e);
        // keyringにも保存を試みる（フォールバック）
        if let Err(e) = ApiKeyManager::save_api_key(&api_key) {
            eprintln!("Warning: Failed to save to keyring: {}", e);
        }
    }
    
    Ok(())
}

#[tauri::command]
pub async fn check_api_key(state: State<'_, TTSState>) -> Result<bool, String> {
    let mut stored_key = state.api_key.lock().await;
    if stored_key.is_some() {
        return Ok(true);
    }
    
    // メモリにない場合はファイルから取得を試みる
    if let Ok(api_key) = ApiKeyStorage::get_api_key() {
        eprintln!("Loaded API key from file storage");
        *stored_key = Some(api_key);
        return Ok(true);
    }
    
    // ファイルにもない場合はkeyringから取得を試みる
    if let Ok(api_key) = ApiKeyManager::get_api_key() {
        eprintln!("Loaded API key from keyring");
        // ファイルにも保存しておく
        let _ = ApiKeyStorage::save_api_key(&api_key);
        *stored_key = Some(api_key);
        return Ok(true);
    }
    
    Ok(false)
}

#[tauri::command]
pub async fn remove_api_key(state: State<'_, TTSState>) -> Result<(), String> {
    // メモリから削除
    let mut stored_key = state.api_key.lock().await;
    *stored_key = None;
    
    // ファイルからも削除
    if let Err(e) = ApiKeyStorage::delete_api_key() {
        eprintln!("Warning: Failed to delete from file: {}", e);
    }
    
    // keyringからも削除を試みる（エラーは無視）
    if let Err(e) = ApiKeyManager::delete_api_key() {
        eprintln!("Warning: Failed to delete from keyring: {}", e);
    }
    
    Ok(())
}

#[tauri::command]
pub async fn update_tts_config(
    state: State<'_, TTSState>,
    model_id: Option<String>,
    voice_id: Option<String>,
    speed: Option<f32>,
    volume: Option<f32>,
    language: Option<String>,
    voice_speed: Option<f32>,
) -> Result<(), String> {
    let mut config = state.config.lock().await;
    
    if let Some(model_id) = model_id {
        config.model_id = model_id;
    }
    if let Some(voice_id) = voice_id {
        config.voice_id = voice_id;
    }
    if let Some(speed) = speed {
        config.speed = speed.clamp(0.5, 2.0);
    }
    if let Some(volume) = volume {
        config.volume = volume.clamp(0.0, 1.0);
        // 再生中の音声の音量も更新
        let audio_manager = state.audio_manager.lock().await;
        if let Some(manager) = audio_manager.as_ref() {
            let _ = manager.set_volume(config.volume);
        }
    }
    if let Some(language) = language {
        config.language = language;
    }
    if let Some(voice_speed) = voice_speed {
        config.voice_speed = voice_speed.clamp(-1.0, 1.0);
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
    app: AppHandle,
    state: State<'_, TTSState>,
    text: String,
) -> Result<(), String> {
    eprintln!("synthesize_speech command called with text: {}", text);
    // 既に合成中の場合はエラー
    let mut is_synthesizing = state.is_synthesizing.lock().await;
    if *is_synthesizing {
        return Err("既に音声合成が実行中です".to_string());
    }
    *is_synthesizing = true;
    drop(is_synthesizing);
    
    // キャンセル用のチャンネルを作成
    let (cancel_tx, cancel_rx) = oneshot::channel::<()>();
    let mut cancel_sender = state.cancel_tx.lock().await;
    *cancel_sender = Some(cancel_tx);
    drop(cancel_sender);
    
    let config = state.config.lock().await.clone();
    let is_synthesizing_clone = state.is_synthesizing.clone();
    
    // 音声データ受信用のチャンネルを作成
    let (audio_tx, mut audio_rx) = mpsc::channel::<Vec<u8>>(100);
    
    // AudioManagerを作成・初期化
    let manager = AudioManager::new().map_err(|e| format!("音声マネージャーの初期化に失敗しました: {}", e))?;
    manager.set_volume(config.volume).map_err(|e| format!("音量設定に失敗しました: {}", e))?;
    
    // 状態を更新
    let mut audio_manager_lock = state.audio_manager.lock().await;
    *audio_manager_lock = Some(manager);
    drop(audio_manager_lock);
    
    // PCMデータ変換とRust側での再生タスク
    let app_clone = app.clone();
    let audio_manager_state = state.audio_manager.clone();
    tokio::spawn(async move {
        let mut chunk_count = 0;
        while let Some(audio_data) = audio_rx.recv().await {
            chunk_count += 1;
            eprintln!("Processing audio chunk #{} ({} bytes)", chunk_count, audio_data.len());
            
            // PCM f32le形式のバイトデータをf32配列に変換
            let mut f32_samples = Vec::with_capacity(audio_data.len() / 4);
            for chunk in audio_data.chunks_exact(4) {
                if let Ok(bytes) = <[u8; 4]>::try_from(chunk) {
                    let sample = f32::from_le_bytes(bytes);
                    f32_samples.push(sample);
                }
            }
            
            // Rust側のプレイヤーに送信
            let manager_lock = audio_manager_state.lock().await;
            if let Some(manager) = manager_lock.as_ref() {
                if let Err(e) = manager.play_audio(f32_samples) {
                    eprintln!("音声データの送信に失敗しました: {}", e);
                }
            }
        }
        
        eprintln!("All audio chunks processed. Emitting audio-complete event");
        // 合成完了を通知
        let _ = app_clone.emit("audio-complete", ());
        
        // 合成完了フラグをリセット
        let mut is_synthesizing = is_synthesizing_clone.lock().await;
        *is_synthesizing = false;
        
        // オーディオマネージャーをクリーンアップ
        let mut audio_manager_lock = audio_manager_state.lock().await;
        *audio_manager_lock = None;
    });
    
    // APIキーを取得
    let api_key = {
        let stored_key = state.api_key.lock().await;
        eprintln!("Checking stored API key: {:?}", stored_key.is_some());
        match stored_key.as_ref() {
            Some(key) => {
                eprintln!("Using API key from memory");
                key.clone()
            },
            None => {
                eprintln!("No API key in memory, trying keyring...");
                // メモリにない場合はファイルから取得を試みる
                if let Ok(key) = ApiKeyStorage::get_api_key() {
                    eprintln!("Got API key from file storage");
                    key
                } else if let Ok(key) = ApiKeyManager::get_api_key() {
                    eprintln!("Got API key from keyring");
                    // ファイルにも保存しておく
                    let _ = ApiKeyStorage::save_api_key(&key);
                    key
                } else {
                    eprintln!("Failed to get API key from any source");
                    let _ = app.emit("audio-error", "APIキーが設定されていません".to_string());
                    return Err("APIキーが設定されていません".to_string());
                }
            }
        }
    };
    
    // バックグラウンドで音声合成を実行
    let cancel_tx_clone = state.cancel_tx.clone();
    tokio::spawn(async move {
        eprintln!("Starting synthesis task...");
        let client = CartesiaClient::new_with_api_key(config, api_key);
        
        if let Err(e) = client.synthesize_speech(&text, audio_tx, cancel_rx).await {
            eprintln!("音声合成に失敗しました: {}", e);
            let _ = app.emit("audio-error", format!("音声合成に失敗しました: {}", e));
        } else {
            eprintln!("Synthesis completed successfully");
        }
        
        // キャンセルチャンネルをクリア
        let mut cancel_sender = cancel_tx_clone.lock().await;
        *cancel_sender = None;
    });
    
    info!("[TTS Command] Command returned successfully");
    Ok(())
}

#[tauri::command]
pub async fn stop_speech(state: State<'_, TTSState>) -> Result<(), String> {
    eprintln!("stop_speech command called");
    
    // キャンセル信号を送信
    let mut cancel_sender = state.cancel_tx.lock().await;
    if let Some(sender) = cancel_sender.take() {
        let _ = sender.send(());
        eprintln!("Cancel signal sent");
    }
    
    // 音声再生を停止
    let mut audio_manager = state.audio_manager.lock().await;
    if let Some(manager) = audio_manager.as_ref() {
        let _ = manager.stop();
        eprintln!("Audio playback stopped");
    }
    *audio_manager = None;
    
    let mut is_synthesizing = state.is_synthesizing.lock().await;
    *is_synthesizing = false;
    Ok(())
}