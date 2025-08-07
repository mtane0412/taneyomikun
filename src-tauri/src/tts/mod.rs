/**
 * TTSモジュールのエントリーポイント
 * Cartesia APIとの通信、音声合成機能を提供
 */

pub mod cartesia;
pub mod config;
pub mod error;

pub use cartesia::CartesiaClient;
pub use config::TTSConfig;
