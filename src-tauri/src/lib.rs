/**
 * Tauriアプリケーションのライブラリエントリーポイント
 * コマンドやモジュールの登録を行う
**/

mod commands;
mod tts;

use commands::tts::*;
use std::sync::Arc;
use tokio::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AudioState {
            is_playing: Arc::new(Mutex::new(false)),
        })
        .invoke_handler(tauri::generate_handler![
            save_api_key,
            check_api_key,
            delete_api_key,
            get_voices,
            synthesize_text,
            stop_synthesis
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}