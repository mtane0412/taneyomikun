/**
 * HTTPエンドポイントハンドラー
 * TTSリクエストを処理する各種ハンドラー関数
 */

use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Json},
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

#[derive(Debug, Serialize, Deserialize)]
pub struct TtsRequest {
    pub text: String,
    #[serde(default)]
    pub priority: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TtsResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
}

pub struct AppState {
    pub app_handle: Arc<Mutex<AppHandle>>,
}

/// テキスト読み上げエンドポイント
pub async fn handle_tts(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<TtsRequest>,
) -> impl IntoResponse {
    if payload.text.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(TtsResponse {
                success: false,
                message: "テキストが空です".to_string(),
            }),
        );
    }

    // Tauriアプリケーションに読み上げイベントを送信
    let app_handle = state.app_handle.lock().await;
    
    log::info!("Sending http-tts-request event with payload: {:?}", payload);
    
    // すべてのウィンドウにイベントを送信
    match app_handle.emit("http-tts-request", &payload) {
        Ok(_) => {
            log::info!("Successfully emitted http-tts-request event");
            (
            StatusCode::OK,
            Json(TtsResponse {
                success: true,
                message: "読み上げリクエストを受け付けました".to_string(),
            }),
        )
        },
        Err(e) => {
            log::error!("Failed to emit http-tts-request event: {}", e);
            (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(TtsResponse {
                success: false,
                message: format!("エラーが発生しました: {}", e),
            }),
        )
        },
    }
}

/// ヘルスチェックエンドポイント
pub async fn handle_health() -> impl IntoResponse {
    Json(HealthResponse {
        status: "ok".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}