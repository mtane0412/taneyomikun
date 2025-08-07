# タネヨミくん

音声読み上げデスクトップアプリケーション - Tauri v2 + React + TypeScript

## 機能

- 📝 テキスト読み上げ機能（Cartesia TTS API使用）
- 🎚️ 音量・読み上げ速度の調整
- 📋 読み上げキューシステム（優先度管理付き）
- 🌐 HTTPサーバー機能（外部アプリケーションからの読み上げ対応）
- 💾 設定の永続化

## 開発環境のセットアップ

### 必要な環境
- Node.js 18以上
- Rust 1.70以上
- npm または yarn
- Cartesia API キー（[cartesia.ai](https://cartesia.ai)で取得）

### インストール
```bash
npm install
```

### 開発サーバーの起動
```bash
npm run tauri:dev
```

### ビルド
```bash
npm run tauri:build
```

### その他のコマンド
- `npm run dev` - Vite開発サーバーのみ起動
- `npm run build` - フロントエンドのビルド
- `npm run lint` - ESLintによるコードチェック
- `npm run format` - Prettierによるコードフォーマット

## HTTPサーバー機能

アプリケーション起動時に自動的にHTTPサーバーが起動します（デフォルトポート: 50080）。

### 使用方法

```bash
# テキスト送信
curl -X POST http://localhost:50080/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "読み上げたいテキスト"}'

# 優先度付き送信
curl -X POST http://localhost:50080/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "緊急メッセージ", "priority": "high"}'

# ヘルスチェック
curl http://localhost:50080/health
```

### テストスクリプト

```bash
# 付属のテストスクリプトを使用
./test-http.sh [ポート番号] [テキスト]

# 例
./test-http.sh 50080 "これはテストメッセージです"
```

## プロジェクト構造
```
taneyomikun/
├── src/                    # フロントエンドソース
│   ├── components/         # UIコンポーネント
│   ├── hooks/             # カスタムフック
│   ├── stores/            # 状態管理
│   └── utils/             # ユーティリティ関数
├── src-tauri/             # Rustバックエンド
│   ├── src/
│   │   ├── commands/      # Tauriコマンド
│   │   ├── tts/          # TTS関連モジュール
│   │   ├── http/         # HTTPサーバー
│   │   └── config/       # 設定管理
└── tests/                 # テストファイル
```

## 開発状況

詳細な開発計画は [docs/development-plan.md](docs/development-plan.md) を参照してください。

### 完了済み機能
- ✅ 基本的なUIデザインと実装
- ✅ Cartesia TTS API統合（音声合成）
- ✅ 音声再生機能（ストリーミング対応）
- ✅ APIキーの安全な保存
- ✅ 音量・速度調整機能
- ✅ 読み上げキューシステム
- ✅ HTTPサーバー機能

### 今後の実装予定
- システムトレイ対応
- ホットキー機能
- 読み上げ履歴機能