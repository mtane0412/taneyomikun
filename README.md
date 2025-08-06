# タネヨミくん

音声読み上げデスクトップアプリケーション（Tauri v2 + React + TypeScript）

## 開発環境のセットアップ

### 必要な環境
- Node.js 18以上
- Rust 1.70以上
- npm または yarn

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
│   │   └── config/       # 設定管理
└── tests/                 # テストファイル
```

## 開発状況
- ✅ フェーズ1: 基盤構築
  - ✅ プロジェクトセットアップ
  - ✅ TypeScript設定
  - ✅ ESLint/Prettier設定
  - ✅ 基本的なプロジェクト構造の確立
- ⏳ フェーズ2: 基本機能実装
  - 基本的なUIデザインと実装
  - Cartesia TTS API統合
  - 音声再生機能の実装