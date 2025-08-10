/**
 * APIキーの安全な保存
 * アプリケーションのデータディレクトリに暗号化して保存
 */

use std::fs;
use std::path::PathBuf;
use super::error::{TTSError, TTSResult};

const API_KEY_FILE: &str = "api_key.dat";

pub struct ApiKeyStorage;

impl ApiKeyStorage {
    fn get_storage_path() -> TTSResult<PathBuf> {
        // ホームディレクトリの.Taneyomi-kun以下に保存
        let home_dir = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .map_err(|_| TTSError::ConfigError("ホームディレクトリが見つかりません".to_string()))?;
            
        let app_dir = PathBuf::from(home_dir).join(".Taneyomi-kun");
        
        // ディレクトリが存在しない場合は作成
        if !app_dir.exists() {
            fs::create_dir_all(&app_dir)
                .map_err(|e| TTSError::ConfigError(format!("ディレクトリの作成に失敗: {}", e)))?;
        }
        
        Ok(app_dir.join(API_KEY_FILE))
    }
    
    pub fn save_api_key(api_key: &str) -> TTSResult<()> {
        let path = Self::get_storage_path()?;
        
        // 簡易的な暗号化（XOR）
        let encrypted = Self::simple_encrypt(api_key);
        
        fs::write(&path, encrypted)
            .map_err(|e| TTSError::ConfigError(format!("APIキーの保存に失敗: {}", e)))?;
            
        eprintln!("API key saved to: {:?}", path);
        Ok(())
    }
    
    pub fn get_api_key() -> TTSResult<String> {
        let path = Self::get_storage_path()?;
        
        if !path.exists() {
            return Err(TTSError::ApiKeyNotFound);
        }
        
        let encrypted = fs::read(&path)
            .map_err(|e| TTSError::ConfigError(format!("APIキーの読み込みに失敗: {}", e)))?;
            
        let api_key = Self::simple_decrypt(&encrypted);
        Ok(api_key)
    }
    
    pub fn delete_api_key() -> TTSResult<()> {
        let path = Self::get_storage_path()?;
        
        if path.exists() {
            fs::remove_file(&path)
                .map_err(|e| TTSError::ConfigError(format!("APIキーの削除に失敗: {}", e)))?;
        }
        
        Ok(())
    }
    
    #[allow(dead_code)]
    pub fn has_api_key() -> bool {
        match Self::get_storage_path() {
            Ok(path) => path.exists(),
            Err(_) => false,
        }
    }
    
    // 簡易的な暗号化（本番環境では適切な暗号化ライブラリを使用すべき）
    fn simple_encrypt(text: &str) -> Vec<u8> {
        let key = 0x42u8; // 固定キー（本番では安全な鍵管理が必要）
        text.bytes().map(|b| b ^ key).collect()
    }
    
    fn simple_decrypt(data: &[u8]) -> String {
        let key = 0x42u8;
        let decrypted: Vec<u8> = data.iter().map(|&b| b ^ key).collect();
        String::from_utf8_lossy(&decrypted).to_string()
    }
}