# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

タネヨミくん - 音声読み上げデスクトップアプリケーション
- Tauri v2 + React + TypeScriptで開発
- Cartesia TTS APIを使用した音声合成機能を実装予定

## 開発コマンド

### 開発サーバー起動
```bash
npm run tauri:dev  # Tauriアプリとして起動
npm run dev        # Viteのみ（フロントエンド開発時）
```

### ビルド
```bash
npm run tauri:build  # 本番用ビルド
npm run build        # フロントエンドのみビルド
```

### コード品質管理
```bash
npm run lint    # ESLintチェック（必須：コード修正後は必ず実行）
npm run format  # Prettierでフォーマット
```

### テスト
現在テストは未実装。TDD（RED-GREEN-REFACTOR）で実装する必要あり。

## アーキテクチャ概要

### フロントエンド構造
```
src/
├── components/   # UIコンポーネント
├── hooks/       # カスタムReactフック
├── stores/      # 状態管理（実装予定）
└── utils/       # ユーティリティ関数
```

### バックエンド構造
```
src-tauri/
└── src/
    ├── commands/  # Tauriコマンド（フロントエンドから呼び出される）
    ├── tts/       # TTS関連モジュール（Cartesia API統合）
    └── config/    # 設定管理（APIキー等の保存）
```

### 主要な技術的決定事項

1. **TypeScript設定**: Strict modeを有効化
2. **フォーマット**: Prettierでセミコロンなし、シングルクォート使用
3. **状態管理**: 未決定（必要に応じて実装）
4. **TTS通信**: WebSocketを使用したストリーミング音声受信予定

## 開発時の注意事項

1. **ファイル冒頭にコメントで仕様を記述**
```ts
/**
 * テキストを音声に変換して再生するコマンド
 */
```

2. **テスト駆動開発（TDD）の実践**
   - 機能実装前にテストを作成
   - RED → GREEN → REFACTORサイクルを守る

3. **Tauriコマンドの実装パターン**
   - フロントエンドからinvokeで呼び出し
   - Rust側でコマンドハンドラーを実装
   - エラーハンドリングを適切に行う

4. **APIキーの管理**
   - Tauriのcredentials APIを使用して安全に保存
   - ハードコードしない

## 現在の開発状況

- ✅ フェーズ1（基盤構築）完了
- 🚧 フェーズ2（基本機能実装）進行中
  - 基本UIは実装済み
  - Cartesia API統合待ち
  - 音声再生機能実装待ち