/**
 * HTTPサーバー設定管理
 * ポート番号の設定と永続化を管理
 */

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpServerConfig {
    pub port: u16,
    pub enabled: bool,
}

impl Default for HttpServerConfig {
    fn default() -> Self {
        Self {
            port: 50080,
            enabled: true,
        }
    }
}

pub type SharedConfig = Arc<RwLock<HttpServerConfig>>;

impl HttpServerConfig {
    #[allow(dead_code)]
    pub fn new(port: u16, enabled: bool) -> Self {
        Self { port, enabled }
    }

    pub fn validate_port(port: u16) -> Result<(), String> {
        if port < 1024 {
            Err("ポート番号は1024以上を指定してください".to_string())
        } else {
            Ok(())
        }
    }
}