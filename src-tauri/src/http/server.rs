/**
 * HTTPサーバー実装
 * axumを使用したHTTPサーバーの起動と管理
 */

use axum::{
    routing::{get, post},
    Router,
};
use std::net::SocketAddr;
use std::sync::Arc;
use tauri::AppHandle;
use tokio::sync::Mutex;
use tower_http::cors::{Any, CorsLayer};

use super::config::SharedConfig;
use super::handlers::{handle_health, handle_tts, AppState};

pub struct HttpServer {
    config: SharedConfig,
    app_handle: Arc<Mutex<AppHandle>>,
}

impl HttpServer {
    pub fn new(config: SharedConfig, app_handle: AppHandle) -> Self {
        Self {
            config,
            app_handle: Arc::new(Mutex::new(app_handle)),
        }
    }

    pub async fn start(&self) -> Result<(), Box<dyn std::error::Error>> {
        let config = self.config.read().await;
        
        if !config.enabled {
            log::info!("HTTPサーバーは無効化されています");
            return Ok(());
        }

        let port = config.port;
        drop(config);

        let state = Arc::new(AppState {
            app_handle: Arc::clone(&self.app_handle),
        });

        let cors = CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any);

        let app = Router::new()
            .route("/health", get(handle_health))
            .route("/tts", post(handle_tts))
            .layer(cors)
            .with_state(state);

        let addr = SocketAddr::from(([127, 0, 0, 1], port));
        
        log::info!("HTTPサーバーを起動します: http://{}", addr);

        let listener = tokio::net::TcpListener::bind(addr).await?;
        
        axum::serve(listener, app)
            .await
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;

        Ok(())
    }
}