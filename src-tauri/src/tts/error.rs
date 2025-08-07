/**
 * TTS関連のエラー型定義
 * Cartesia APIとの通信エラーや設定エラーを管理する
 */

use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Serialize, Deserialize)]
pub enum TTSError {
    ApiKeyNotFound,
    ApiKeyInvalid,
    NetworkError(String),
    WebSocketError(String),
    ApiError(String),
    ConfigError(String),
    AudioError(String),
    Storage(String),
    UnknownError(String),
}

impl fmt::Display for TTSError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TTSError::ApiKeyNotFound => write!(f, "APIキーが設定されていません"),
            TTSError::ApiKeyInvalid => write!(f, "APIキーが無効です"),
            TTSError::NetworkError(msg) => write!(f, "ネットワークエラー: {}", msg),
            TTSError::WebSocketError(msg) => write!(f, "WebSocketエラー: {}", msg),
            TTSError::ApiError(msg) => write!(f, "APIエラー: {}", msg),
            TTSError::ConfigError(msg) => write!(f, "設定エラー: {}", msg),
            TTSError::AudioError(msg) => write!(f, "音声エラー: {}", msg),
            TTSError::Storage(msg) => write!(f, "ストレージエラー: {}", msg),
            TTSError::UnknownError(msg) => write!(f, "不明なエラー: {}", msg),
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

impl From<anyhow::Error> for TTSError {
    fn from(err: anyhow::Error) -> Self {
        TTSError::UnknownError(err.to_string())
    }
}

impl From<keyring::Error> for TTSError {
    fn from(err: keyring::Error) -> Self {
        TTSError::ConfigError(format!("キーリングエラー: {}", err))
    }
}

pub type TTSResult<T> = Result<T, TTSError>;