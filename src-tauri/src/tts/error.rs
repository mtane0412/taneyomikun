/**
 * TTS関連のエラー定義
 * API通信、WebSocket、音声処理のエラーを統一的に扱う
 */

use std::fmt;

#[derive(Debug)]
pub enum TTSError {
    ApiKeyNotFound,
    NetworkError(String),
    ApiError(String),
    WebSocketError(String),
    AudioProcessingError(String),
    ConfigError(String),
    KeyringError(String),
}

impl fmt::Display for TTSError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TTSError::ApiKeyNotFound => write!(f, "APIキーが設定されていません"),
            TTSError::NetworkError(msg) => write!(f, "ネットワークエラー: {}", msg),
            TTSError::ApiError(msg) => write!(f, "APIエラー: {}", msg),
            TTSError::WebSocketError(msg) => write!(f, "WebSocketエラー: {}", msg),
            TTSError::AudioProcessingError(msg) => write!(f, "音声処理エラー: {}", msg),
            TTSError::ConfigError(msg) => write!(f, "設定エラー: {}", msg),
            TTSError::KeyringError(msg) => write!(f, "キーリングエラー: {}", msg),
        }
    }
}

impl std::error::Error for TTSError {}

impl From<reqwest::Error> for TTSError {
    fn from(err: reqwest::Error) -> Self {
        TTSError::NetworkError(err.to_string())
    }
}

impl From<tokio_tungstenite::tungstenite::Error> for TTSError {
    fn from(err: tokio_tungstenite::tungstenite::Error) -> Self {
        TTSError::WebSocketError(err.to_string())
    }
}

impl From<keyring::Error> for TTSError {
    fn from(err: keyring::Error) -> Self {
        TTSError::KeyringError(err.to_string())
    }
}

pub type TTSResult<T> = Result<T, TTSError>;