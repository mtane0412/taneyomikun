/**
 * Tauriアプリケーションのライブラリエントリーポイント
 * コマンドやモジュールの登録を行う
**/

mod commands;
mod tts;

use commands::tts::{TTSState, set_api_key, check_api_key, remove_api_key, update_tts_config, get_tts_config, synthesize_speech};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(TTSState::default())
        .invoke_handler(tauri::generate_handler![
            set_api_key,
            check_api_key,
            remove_api_key,
            update_tts_config,
            get_tts_config,
            synthesize_speech
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}