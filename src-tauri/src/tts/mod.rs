/**
 * TTS (Text-to-Speech) モジュール
 * Cartesia APIとの通信を管理し、音声合成機能を提供する
 */

pub mod client;
pub mod config;
pub mod error;
pub mod storage;

pub use config::TTSConfig;