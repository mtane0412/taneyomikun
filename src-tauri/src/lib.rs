/**
 * Tauriアプリケーションのライブラリエントリーポイント
 * コマンドやモジュールの登録を行う
**/

mod commands;
mod tts;

use commands::tts::{
    TTSState, 
    set_api_key, 
    check_api_key, 
    remove_api_key, 
    update_tts_config, 
    get_tts_config, 
    synthesize_speech,
    stop_speech
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // ログシステムを初期化
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .format_timestamp_millis()
        .init();
    
    log::info!("[Main] Starting Tauri application");
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(TTSState::default())
        .invoke_handler(tauri::generate_handler![
            set_api_key,
            check_api_key,
            remove_api_key,
            update_tts_config,
            get_tts_config,
            synthesize_speech,
            stop_speech
        ])
        .setup(|_app| {
            log::info!("[Main] Tauri app setup complete");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}