/**
 * Cartesia APIクライアント
 * WebSocket接続を管理し、音声合成リクエストを送信する
 */

use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use tokio_tungstenite::{connect_async, tungstenite::Message};
use log::{debug, info, warn, error};

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
    #[serde(rename = "__experimental_controls", skip_serializing_if = "Option::is_none")]
    experimental_controls: Option<ExperimentalControls>,
}

#[derive(Debug, Serialize)]
struct ExperimentalControls {
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
    #[allow(dead_code)]
    pub fn new(config: TTSConfig) -> TTSResult<Self> {
        let api_key = ApiKeyManager::get_api_key()?;
        Ok(Self { config, api_key })
    }
    
    pub fn new_with_api_key(config: TTSConfig, api_key: String) -> Self {
        Self { config, api_key }
    }

    pub async fn synthesize_speech(
        &self,
        text: &str,
        audio_tx: mpsc::Sender<Vec<u8>>,
    ) -> TTSResult<()> {
        let url = format!("{}?api_key={}&cartesia_version=2024-06-10", CARTESIA_WS_URL, self.api_key);
        info!("[TTS Client] Connecting to Cartesia WebSocket");
        debug!("[TTS Client] URL: {}", url.replace(&self.api_key, "***"));
        
        let (ws_stream, _) = connect_async(&url).await?;
        info!("[TTS Client] WebSocket connection established");
        let (mut write, mut read) = ws_stream.split();

        let request = TTSRequest {
            context_id: uuid::Uuid::new_v4().to_string(),
            model_id: self.config.model_id.clone(),
            transcript: text.to_string(),
            voice: VoiceConfig {
                mode: "id".to_string(),
                id: self.config.voice_id.clone(),
                speed: Some(format!("{:.1}", self.config.speed)),
                experimental_controls: if self.config.voice_speed != 0.0 {
                    Some(ExperimentalControls {
                        speed: Some(format_voice_speed(self.config.voice_speed)),
                    })
                } else {
                    None
                },
            },
            output_format: OutputFormat {
                container: "raw".to_string(),
                encoding: "pcm_f32le".to_string(),
                sample_rate: 44100,
            },
            language: Some(self.config.language.clone()),
            stream: Some(true),
        };
        
        info!("[TTS Client] Request - Voice: {}, Language: {}, Speed: {:.1}, Voice Speed: {:.1}", 
              self.config.voice_id, self.config.language, self.config.speed, self.config.voice_speed);
        debug!("[TTS Client] Text to synthesize: {}", text);

        let request_json = serde_json::to_string(&request)
            .map_err(|e| TTSError::ApiError(format!("Failed to serialize request: {}", e)))?;
        
        debug!("[TTS Client] Sending request: {}", request_json);
        write.send(Message::Text(request_json)).await?;
        info!("[TTS Client] Request sent successfully");

        info!("[TTS Client] Starting to receive audio chunks");
        let mut chunk_count = 0;
        let mut total_bytes = 0;
        
        while let Some(message) = read.next().await {
            match message? {
                Message::Text(text) => {
                    debug!("[TTS Client] Received text message: {}", text);
                    let response: TTSResponse = serde_json::from_str(&text)
                        .map_err(|e| TTSError::ApiError(format!("Failed to parse response: {}", e)))?;
                    
                    match response.response_type.as_str() {
                        "chunk" => {
                            if let Some(data) = response.data {
                                chunk_count += 1;
                                debug!("[TTS Client] Processing chunk #{}, base64 length: {}", chunk_count, data.len());
                                
                                let audio_data = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &data)
                                    .map_err(|e| TTSError::AudioError(format!("Failed to decode audio: {}", e)))?;
                                
                                total_bytes += audio_data.len();
                                info!("[TTS Client] Decoded chunk #{}, size: {} bytes, total: {} bytes", 
                                      chunk_count, audio_data.len(), total_bytes);
                                
                                audio_tx.send(audio_data).await
                                    .map_err(|e| TTSError::AudioError(format!("Failed to send audio: {}", e)))?;
                                debug!("[TTS Client] Chunk sent to audio channel");
                            }
                        }
                        "done" => {
                            info!("[TTS Client] Audio synthesis complete. Total chunks: {}, Total bytes: {}", 
                                  chunk_count, total_bytes);
                            break;
                        }
                        "error" => {
                            let error_msg = response.error.unwrap_or_else(|| "Unknown error".to_string());
                            error!("[TTS Client] API error: {}", error_msg);
                            return Err(TTSError::ApiError(error_msg));
                        }
                        _ => {
                            warn!("[TTS Client] Unknown response type: {}", response.response_type);
                        }
                    }
                }
                Message::Close(_) => {
                    warn!("[TTS Client] WebSocket closed by server");
                    break;
                }
                _ => {
                    debug!("[TTS Client] Received non-text message type");
                }
            }
        }

        Ok(())
    }
}

fn format_voice_speed(speed: f32) -> String {
    if speed <= -1.0 {
        "slowest".to_string()
    } else if speed <= -0.5 {
        "slow".to_string()
    } else if speed <= 0.0 {
        "normal".to_string()
    } else if speed <= 0.5 {
        "fast".to_string()
    } else {
        "fastest".to_string()
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