/**
 * Cartesia TTS APIクライアント
 * WebSocket通信による音声ストリーミング処理
 */

use tokio_tungstenite::{connect_async, tungstenite::Message};
use futures_util::{StreamExt, SinkExt};
use serde::{Deserialize, Serialize};
use super::error::{TTSError, TTSResult};
use super::config::{TTSConfig, ConfigManager};

const CARTESIA_WS_URL: &str = "wss://api.cartesia.ai/tts/websocket";


#[derive(Debug, Serialize)]
struct TTSRequest {
    #[serde(rename = "type")]
    msg_type: String,
    text: String,
    voice: String,
    speed: f32,
    volume: f32,
}

#[derive(Debug, Deserialize)]
struct TTSResponse {
    #[serde(rename = "type")]
    msg_type: String,
    data: Option<String>,
    error: Option<String>,
}

pub struct CartesiaClient {
    api_key: String,
    config: TTSConfig,
}

impl CartesiaClient {
    pub async fn new() -> TTSResult<Self> {
        let api_key = ConfigManager::get_api_key()?;
        let config = TTSConfig::default();
        
        Ok(Self { api_key, config })
    }

    pub async fn new_with_config(config: TTSConfig) -> TTSResult<Self> {
        let api_key = ConfigManager::get_api_key()?;
        
        Ok(Self { api_key, config })
    }

    pub async fn synthesize_stream(
        &self,
        text: &str,
        on_audio_chunk: impl Fn(Vec<u8>) -> TTSResult<()>,
    ) -> TTSResult<()> {
        let url = format!("{}?api_key={}", CARTESIA_WS_URL, self.api_key);
        let (ws_stream, _) = connect_async(&url).await?;
        let (mut write, mut read) = ws_stream.split();

        let request = TTSRequest {
            msg_type: "synthesize".to_string(),
            text: text.to_string(),
            voice: self.config.voice_id.clone(),
            speed: self.config.speed,
            volume: self.config.volume,
        };

        let message = Message::Text(serde_json::to_string(&request).unwrap());
        write.send(message).await?;

        while let Some(msg) = read.next().await {
            match msg? {
                Message::Text(text) => {
                    let response: TTSResponse = serde_json::from_str(&text)
                        .map_err(|e| TTSError::ApiError(e.to_string()))?;
                    
                    if let Some(error) = response.error {
                        return Err(TTSError::ApiError(error));
                    }

                    if response.msg_type == "audio" {
                        if let Some(audio_data) = response.data {
                            let audio_bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &audio_data)
                                .map_err(|e| TTSError::AudioProcessingError(e.to_string()))?;
                            on_audio_chunk(audio_bytes)?;
                        }
                    } else if response.msg_type == "done" {
                        break;
                    }
                }
                Message::Close(_) => break,
                _ => {}
            }
        }

        Ok(())
    }

    pub async fn get_voices() -> TTSResult<Vec<serde_json::Value>> {
        let api_key = ConfigManager::get_api_key()?;
        let client = reqwest::Client::new();
        
        let response = client
            .get("https://api.cartesia.ai/voices")
            .header("X-API-Key", api_key)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(TTSError::ApiError(error_text));
        }

        let voices: Vec<serde_json::Value> = response.json().await
            .map_err(|e| TTSError::ApiError(e.to_string()))?;
        
        Ok(voices)
    }

    pub fn update_config(&mut self, config: TTSConfig) {
        self.config = config;
    }
}