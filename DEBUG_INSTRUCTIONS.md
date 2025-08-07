# デバッグ手順書

## 音声が再生されない問題の調査

### 1. デバッグモードで実行

```bash
./debug_run.sh
```

### 2. 確認ポイント

#### ターミナル（Rustログ）で確認すること：

1. **APIキーの保存**
   - `Setting API key...` が表示されるか
   - `API key saved to memory` が表示されるか
   - keyringエラーが出ていないか

2. **音声合成の開始**
   - `synthesize_speech command called with text:` が表示されるか
   - `Checking stored API key: true/false` の結果
   - `Using API key from memory` または `Got API key from keyring` が表示されるか

3. **WebSocket接続**
   - `Starting synthesis task...` が表示されるか
   - `[TTS Client] Connecting to Cartesia WebSocket` が表示されるか
   - `[TTS Client] WebSocket connection established` が表示されるか
   - エラーメッセージが出ていないか

4. **音声データの送受信**
   - `[TTS Client] Sending request:` でリクエスト内容が表示されるか
   - `[TTS Client] Received chunk with X bytes` が表示されるか
   - `[TTS Client] Synthesis complete` が表示されるか

#### ブラウザのコンソール（JavaScriptログ）で確認すること：

1. **APIキーの設定**
   - `[TTS] Setting API key...` が表示されるか
   - `[TTS] API key set successfully` が表示されるか

2. **音声合成の開始**
   - `[TTS] Starting speech synthesis for text:` が表示されるか
   - `[TTS] Synthesis request sent` が表示されるか

3. **イベントの受信**
   - `[App] Received audio chunk event` が表示されるか
   - `[AudioPlayer] Appending audio chunk:` が表示されるか
   - `[App] Audio complete event received` が表示されるか
   - `[App] Audio error:` でエラーが表示されていないか

4. **音声再生**
   - `[AudioPlayer] Creating AudioBuffer` が表示されるか
   - `[AudioPlayer] Starting playback` が表示されるか
   - `[AudioPlayer] Scheduling buffer` が表示されるか

### 3. よくある問題と解決方法

#### APIキーが保存されない
- macOSのキーチェーンアクセスの権限問題
- → アプリケーションを一度完全に終了して再起動

#### WebSocket接続エラー
- APIキーが正しくない
- ネットワーク接続の問題
- Cartesia APIのエンドポイントが変更された

#### 音声データが受信されない
- リクエストフォーマットが正しくない
- voice_idが無効
- APIキーに権限がない

#### フロントエンドでイベントが受信されない
- Tauriのイベントシステムの問題
- イベント名のタイポ

### 4. 追加のデバッグ方法

#### cURLでCartesia APIを直接テスト

```bash
# WebSocketのテストは難しいため、REST APIがあれば試す
curl -X POST https://api.cartesia.ai/tts/sse \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Cartesia-Version: 2024-06-10" \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "sonic-multilingual",
    "transcript": "こんにちは",
    "voice": {
      "mode": "id",
      "id": "a0e99841-438c-4a64-b679-ae501e7d6091"
    },
    "output_format": {
      "container": "raw",
      "encoding": "pcm_f32le",
      "sample_rate": 44100
    }
  }'
```

### 5. ログの保存

デバッグログを保存して共有する場合：

```bash
./debug_run.sh 2>&1 | tee debug_log.txt
```

ブラウザのコンソールログは、開発者ツールから「Save as...」で保存できます。