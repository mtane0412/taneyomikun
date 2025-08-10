/**
 * テスト用コマンド
 * イベント送信のテスト
 */

use tauri::{AppHandle, Emitter};
use serde_json::json;

#[tauri::command]
pub async fn test_event_emit(app: AppHandle) -> Result<String, String> {
    log::info!("Test: Emitting test event from command");
    
    // テスト用のペイロード
    let payload = json!({
        "text": "テストコマンドからの音声です",
        "priority": "normal"
    });
    
    match app.emit("http-tts-request", &payload) {
        Ok(_) => {
            log::info!("Test: Successfully emitted event");
            Ok("Event emitted successfully".to_string())
        }
        Err(e) => {
            log::error!("Test: Failed to emit event: {}", e);
            Err(format!("Failed to emit event: {}", e))
        }
    }
}