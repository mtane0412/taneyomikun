/**
 * HTTPサーバーモジュール
 * 外部アプリケーションからHTTP経由でテキストを受け取り、音声読み上げを行う
 */

pub mod server;
pub mod config;
pub mod handlers;

pub use server::HttpServer;
pub use config::HttpServerConfig;