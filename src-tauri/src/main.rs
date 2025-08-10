#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/**
 * Tauriアプリケーションのメインエントリーポイント
 * デスクトップアプリケーションの起動
**/

fn main() {
    taneyomi_kun_lib::run()
}