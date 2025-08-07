/**
 * HTTPサーバー関連のTauriコマンド
 * HTTPサーバーの設定管理と起動制御
 */

use crate::http::{HttpServer, HttpServerConfig};
use serde_json::Value;
use std::sync::Arc;
use tauri::{AppHandle, State};
use tokio::sync::RwLock;

#[derive(Default)]
pub struct HttpServerState {
    pub config: Arc<RwLock<HttpServerConfig>>,
}

#[tauri::command]
pub async fn get_http_config(state: State<'_, HttpServerState>) -> Result<Value, String> {
    let config = state.config.read().await;
    Ok(serde_json::to_value(&*config).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn update_http_config(
    state: State<'_, HttpServerState>,
    port: u16,
    enabled: bool,
    app: AppHandle,
) -> Result<(), String> {
    // ポート番号の検証
    HttpServerConfig::validate_port(port)?;

    // 設定を更新
    let mut config = state.config.write().await;
    config.port = port;
    config.enabled = enabled;

    // 設定を保存（実際のアプリケーションではファイルや設定ストアに保存）
    log::info!("HTTPサーバー設定を更新: port={}, enabled={}", port, enabled);

    // サーバーの再起動が必要な場合はここで行う
    if enabled {
        // 新しい設定でサーバーを起動
        let server = HttpServer::new(Arc::clone(&state.config), app);
        
        // 別スレッドでサーバーを起動
        tokio::spawn(async move {
            if let Err(e) = server.start().await {
                log::error!("HTTPサーバーの起動に失敗しました: {}", e);
            }
        });
    }

    Ok(())
}

#[tauri::command]
pub async fn start_http_server(
    state: State<'_, HttpServerState>,
    app: AppHandle,
) -> Result<(), String> {
    let config = state.config.read().await;
    
    if !config.enabled {
        return Err("HTTPサーバーは無効化されています".to_string());
    }

    drop(config);

    let server = HttpServer::new(Arc::clone(&state.config), app);
    
    // 別スレッドでサーバーを起動
    tokio::spawn(async move {
        if let Err(e) = server.start().await {
            log::error!("HTTPサーバーの起動に失敗しました: {}", e);
        }
    });

    Ok(())
}