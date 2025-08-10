# Taneyomi-kun

音声読み上げデスクトップアプリケーション - Tauri v2 + React + TypeScript

## 機能

- 📝 テキスト読み上げ機能（Cartesia TTS API使用）
- 🎯 日本語音声「Tanenobu」・英語音声「Barbershop Man」に対応
- 🎚️ 音量・読み上げ速度の調整
- 📋 読み上げキューシステム（優先度管理付き）
- 🌐 HTTPサーバー機能（外部アプリケーションからの読み上げ対応）
- 🔊 ストリーミング音声再生（リアルタイム再生）
- 💾 設定の永続化（APIキー、音量、速度）

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
外部アプリケーションからHTTP APIを通じて読み上げ機能を利用できます。

### エンドポイント

#### 1. ヘルスチェック
```bash
GET http://localhost:50080/health

# レスポンス例
{
  "status": "ok",
  "version": "1.0.0"
}
```

#### 2. テキスト読み上げ
```bash
POST http://localhost:50080/tts
Content-Type: application/json

{
  "text": "読み上げたいテキスト",     # 必須
  "priority": "normal",              # オプション: "low", "normal", "high"
  "voice_speed": 1.0,               # オプション: 0.5-2.0
  "language": "ja"                  # オプション: "ja" or "en" (デフォルト "ja")
}
```

### 使用例

```bash
# 基本的な読み上げ（日本語）
curl -X POST http://localhost:50080/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "読み上げたいテキスト"}'

# 英語での読み上げ
curl -X POST http://localhost:50080/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, this is an English text.", "language": "en"}'

# 優先度付き送信
curl -X POST http://localhost:50080/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "緊急メッセージ", "priority": "high"}'

# 速度調整付き送信
curl -X POST http://localhost:50080/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "ゆっくり読み上げます", "voice_speed": 0.8}'

# 英語で速度調整
curl -X POST http://localhost:50080/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Speaking slowly in English", "language": "en", "voice_speed": 0.7}'
```

### テストスクリプト

```bash
# 付属のテストスクリプトを使用
./test-http.sh [ポート番号] [テキスト]

# 例
./test-http.sh 50080 "これはテストメッセージです"
```

### セキュリティ

- サーバーは`localhost`（127.0.0.1）でのみリッスン
- 外部ネットワークからのアクセスは不可
- CORS対応済み（ローカル開発用）

## プロジェクト構造
```
Taneyomi-kun/
├── src/                    # フロントエンドソース
│   ├── components/         # UIコンポーネント
│   │   ├── ApiKeySetup.tsx    # APIキー設定
│   │   ├── QueueDisplay.tsx   # キュー表示
│   │   └── VoiceControls.tsx  # 音声コントロール
│   ├── hooks/             # カスタムフック
│   │   ├── useApiKey.ts       # APIキー管理
│   │   ├── useAudioPlayback.ts # 音声再生制御
│   │   └── useQueue.ts        # キュー管理
│   ├── stores/            # 状態管理
│   └── utils/             # ユーティリティ関数
├── src-tauri/             # Rustバックエンド
│   ├── src/
│   │   ├── commands/      # Tauriコマンド
│   │   │   ├── tts.rs         # TTS関連コマンド
│   │   │   └── config.rs      # 設定関連コマンド
│   │   ├── tts/          # TTS関連モジュール
│   │   │   ├── cartesia.rs    # Cartesia API統合
│   │   │   └── queue.rs       # キュー管理
│   │   ├── http/         # HTTPサーバー
│   │   │   └── server.rs      # HTTPサーバー実装
│   │   └── config/       # 設定管理
│   │       └── settings.rs    # 設定永続化
└── tests/                 # テストファイル
```

## 使用方法

### 初回起動時
1. アプリケーションを起動すると、APIキー設定画面が表示されます
2. [Cartesia](https://cartesia.ai)でアカウントを作成し、APIキーを取得
3. 取得したAPIキーを入力して保存

### 基本的な使い方
1. テキストエリアに読み上げたいテキストを入力
2. 言語を選択（日本語/英語）
3. 「読み上げ」ボタンをクリック
4. 音声の再生が開始されます

### 音声調整
- **音量**: スライダーで0%〜100%の範囲で調整
- **速度**: 0.5倍〜2.0倍の範囲で読み上げ速度を調整

### キューシステム
- 複数のテキストを連続で読み上げ可能
- 優先度設定で重要なメッセージを先に読み上げ
- キュー内のアイテムは個別に削除可能

## 開発状況

詳細な開発計画は [docs/development-plan.md](docs/development-plan.md) を参照してください。

### 完了済み機能
- ✅ 基本的なUIデザインと実装
- ✅ Cartesia TTS API統合（音声合成）
- ✅ 音声再生機能（ストリーミング対応）
- ✅ APIキーの安全な保存（Tauri credentials API使用）
- ✅ 音量・速度調整機能
- ✅ 読み上げキューシステム（優先度管理付き）
- ✅ HTTPサーバー機能（外部連携用API）

### 今後の実装予定
- システムトレイ対応
- ホットキー機能
- 読み上げ履歴機能
- 多言語対応の拡張（中国語、韓国語など）
- 複数音声の選択機能（感情表現など）
- テキストのインポート/エクスポート機能