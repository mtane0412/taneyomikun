/**
 * Cartesia APIクライアント
 * WebSocket接続を管理し、音声合成リクエストを送信する
 */

use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use tokio_tungstenite::{connect_async, tungstenite::Message};

use super::config::{ApiKeyManager, TTSConfig};
use super::error::{TTSError, TTSResult};

const CARTESIA_WS_URL: &str = "wss://api.cartesia.ai/tts/websocket";

#[derive(Debug, Serialize)]
struct TTSRequest {
    #[serde(rename = "context_id")]
    context_id: String,
    model_id: String,
    transcript: String,
    voice: VoiceConfig,
    output_format: OutputFormat,
    #[serde(skip_serializing_if = "Option::is_none")]
    language: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stream: Option<bool>,
}

#[derive(Debug, Serialize)]
struct VoiceConfig {
    mode: String,
    id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    speed: Option<String>,
}

#[derive(Debug, Serialize)]
struct OutputFormat {
    container: String,
    encoding: String,
    sample_rate: u32,
}

#[derive(Debug, Deserialize)]
struct TTSResponse {
    #[serde(rename = "type")]
    response_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

pub struct CartesiaClient {
    config: TTSConfig,
    api_key: String,
}

impl CartesiaClient {
    pub fn new(config: TTSConfig) -> TTSResult<Self> {
        let api_key = ApiKeyManager::get_api_key()?;
        Ok(Self { config, api_key })
    }

    pub async fn synthesize_speech(
        &self,
        text: &str,
        audio_tx: mpsc::Sender<Vec<u8>>,
    ) -> TTSResult<()> {
        let url = format!("{}?api_key={}&cartesia_version=2024-06-10", CARTESIA_WS_URL, self.api_key);
        
        let (ws_stream, _) = connect_async(&url).await?;
        let (mut write, mut read) = ws_stream.split();

        let request = TTSRequest {
            context_id: uuid::Uuid::new_v4().to_string(),
            model_id: "sonic-multilingual".to_string(),
            transcript: text.to_string(),
            voice: VoiceConfig {
                mode: "id".to_string(),
                id: self.config.voice_id.clone(),
                speed: Some(format!("{:.1}", self.config.speed)),
            },
            output_format: OutputFormat {
                container: "raw".to_string(),
                encoding: "pcm_f32le".to_string(),
                sample_rate: 44100,
            },
            language: Some(self.config.language.clone()),
            stream: Some(true),
        };

        let request_json = serde_json::to_string(&request)
            .map_err(|e| TTSError::ApiError(format!("Failed to serialize request: {}", e)))?;

        write.send(Message::Text(request_json)).await?;

        while let Some(message) = read.next().await {
            match message? {
                Message::Text(text) => {
                    let response: TTSResponse = serde_json::from_str(&text)
                        .map_err(|e| TTSError::ApiError(format!("Failed to parse response: {}", e)))?;
                    
                    match response.response_type.as_str() {
                        "chunk" => {
                            if let Some(data) = response.data {
                                let audio_data = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &data)
                                    .map_err(|e| TTSError::AudioError(format!("Failed to decode audio: {}", e)))?;
                                audio_tx.send(audio_data).await
                                    .map_err(|e| TTSError::AudioError(format!("Failed to send audio: {}", e)))?;
                            }
                        }
                        "done" => break,
                        "error" => {
                            let error_msg = response.error.unwrap_or_else(|| "Unknown error".to_string());
                            return Err(TTSError::ApiError(error_msg));
                        }
                        _ => {}
                    }
                }
                Message::Close(_) => break,
                _ => {}
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tts_config_default() {
        let config = TTSConfig::default();
        assert_eq!(config.speed, 1.0);
        assert_eq!(config.volume, 1.0);
        assert_eq!(config.language, "ja");
    }

    #[test]
    fn test_tts_config_with_speed() {
        let config = TTSConfig::new().with_speed(1.5);
        assert_eq!(config.speed, 1.5);

        let config = TTSConfig::new().with_speed(3.0);
        assert_eq!(config.speed, 2.0); // Clamped to max

        let config = TTSConfig::new().with_speed(0.1);
        assert_eq!(config.speed, 0.5); // Clamped to min
    }
}