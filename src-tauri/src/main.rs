/**
 * Tauriアプリケーションのメインエントリーポイント
 * デスクトップアプリケーションの起動
**/
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    taneyomikun_lib::run()
}