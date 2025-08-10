/**
 * TTS設定管理モジュール
 * 音声合成の設定やAPIキーの安全な保存を管理する
 */

use keyring::Entry;
use serde::{Deserialize, Serialize};

use super::error::{TTSError, TTSResult};

const SERVICE_NAME: &str = "Taneyomi-kun";
const API_KEY_NAME: &str = "cartesia_api_key";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TTSConfig {
    pub model_id: String,
    pub voice_id: String,
    pub speed: f32,
    pub volume: f32,
    pub language: String,
    pub voice_speed: f32,  // Cartesia API speed parameter (-1.0 to 1.0)
}

impl Default for TTSConfig {
    fn default() -> Self {
        Self {
            model_id: String::from("sonic-2"),
            voice_id: String::from("fb25b315-dfba-444f-b99d-4c8535672cb7"), // Japanese voice
            speed: 1.0,
            volume: 1.0,
            language: String::from("ja"),
            voice_speed: 0.0,  // Default normal speed
        }
    }
}

impl TTSConfig {
    #[allow(dead_code)]
    pub fn new() -> Self {
        Self::default()
    }

    #[allow(dead_code)]
    pub fn with_voice_id(mut self, voice_id: String) -> Self {
        self.voice_id = voice_id;
        self
    }

    #[allow(dead_code)]
    pub fn with_speed(mut self, speed: f32) -> Self {
        self.speed = speed.clamp(0.5, 2.0);
        self
    }

    #[allow(dead_code)]
    pub fn with_volume(mut self, volume: f32) -> Self {
        self.volume = volume.clamp(0.0, 1.0);
        self
    }

    #[allow(dead_code)]
    pub fn with_voice_speed(mut self, voice_speed: f32) -> Self {
        self.voice_speed = voice_speed.clamp(-1.0, 1.0);
        self
    }
}

pub struct ApiKeyManager;

impl ApiKeyManager {
    pub fn save_api_key(api_key: &str) -> TTSResult<()> {
        eprintln!("Attempting to save API key to keyring...");
        let entry = Entry::new(SERVICE_NAME, API_KEY_NAME)
            .map_err(|e| {
                eprintln!("Failed to create keyring entry: {:?}", e);
                TTSError::ConfigError(format!("キーリングエントリの作成に失敗しました: {:?}", e))
            })?;
        entry.set_password(api_key)
            .map_err(|e| {
                eprintln!("Failed to set password in keyring: {:?}", e);
                TTSError::ConfigError(format!("パスワードの設定に失敗しました: {:?}", e))
            })?;
        eprintln!("API key saved to keyring successfully");
        Ok(())
    }

    pub fn get_api_key() -> TTSResult<String> {
        let entry = Entry::new(SERVICE_NAME, API_KEY_NAME)
            .map_err(|e| {
                TTSError::ConfigError(format!("キーリングエントリの作成に失敗しました: {:?}", e))
            })?;
        match entry.get_password() {
            Ok(password) => Ok(password),
            Err(_) => Err(TTSError::ApiKeyNotFound)
        }
    }

    pub fn delete_api_key() -> TTSResult<()> {
        let entry = Entry::new(SERVICE_NAME, API_KEY_NAME)?;
        entry.delete_credential()?;
        Ok(())
    }

    #[allow(dead_code)]
    pub fn has_api_key() -> bool {
        Self::get_api_key().is_ok()
    }
}