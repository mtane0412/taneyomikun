/**
 * Tauriアプリケーションのライブラリエントリーポイント
 * コマンドやモジュールの登録を行う
**/

mod commands;
mod tts;
mod http;
mod audio;

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
use commands::http::{
    HttpServerState,
    get_http_config,
    update_http_config,
    start_http_server
};
use commands::test::test_event_emit;
use std::sync::Arc;
use tokio::sync::RwLock;
use tauri::Manager;


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
        .manage(HttpServerState::default())
        .invoke_handler(tauri::generate_handler![
            set_api_key,
            check_api_key,
            remove_api_key,
            update_tts_config,
            get_tts_config,
            synthesize_speech,
            stop_speech,
            get_http_config,
            update_http_config,
            start_http_server,
            test_event_emit
        ])
        .setup(|app| {
            log::info!("[Main] Tauri app setup complete");
            
            // 開発環境で開発者ツールを自動で開く
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            
            // HTTPサーバーを自動起動
            let app_handle = app.handle().clone();
            
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
                log::info!("[Main] Starting HTTP server...");
                
                // HTTP server will be started via the default configuration
                let http_config = http::HttpServerConfig::default();
                let config = Arc::new(RwLock::new(http_config));
                
                let server = http::HttpServer::new(
                    config,
                    app_handle.clone()
                );
                
                if let Err(e) = server.start().await {
                    log::error!("HTTPサーバーの起動に失敗しました: {}", e);
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}