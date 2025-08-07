/**
 * TTS設定管理
 * APIキーの安全な保存、音声設定の管理
 */

use serde::{Deserialize, Serialize};
use keyring::Entry;
use super::error::{TTSError, TTSResult};

const SERVICE_NAME: &str = "taneyomikun";
const API_KEY_NAME: &str = "cartesia_api_key";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TTSConfig {
    pub voice_id: String,
    pub speed: f32,
    pub volume: f32,
    pub language: String,
}

impl Default for TTSConfig {
    fn default() -> Self {
        Self {
            voice_id: "sonic".to_string(),
            speed: 1.0,
            volume: 1.0,
            language: "ja".to_string(),
        }
    }
}

pub struct ConfigManager;

impl ConfigManager {
    pub fn save_api_key(api_key: &str) -> TTSResult<()> {
        let entry = Entry::new(SERVICE_NAME, API_KEY_NAME)?;
        entry.set_password(api_key)?;
        Ok(())
    }

    pub fn get_api_key() -> TTSResult<String> {
        let entry = Entry::new(SERVICE_NAME, API_KEY_NAME)?;
        entry.get_password()
            .map_err(|_| TTSError::ApiKeyNotFound)
    }

    pub fn delete_api_key() -> TTSResult<()> {
        let entry = Entry::new(SERVICE_NAME, API_KEY_NAME)?;
        entry.delete_credential()?;
        Ok(())
    }
}