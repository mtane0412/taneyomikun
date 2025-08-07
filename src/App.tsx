/**
 * メインアプリケーションコンポーネント
 * 音声読み上げアプリケーションのメインUI
 **/
import { useState } from 'react'

function App() {
  const [text, setText] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(50)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [selectedVoice, setSelectedVoice] = useState('japanese-male-1')
  const [speed, setSpeed] = useState(1.0)

  const handlePlay = () => {
    if (!text.trim()) {
      window.alert('読み上げるテキストを入力してください')
      return
    }
    setIsPlaying(true)
    // TODO: Tauriコマンドを呼び出して読み上げ開始
  }

  const handleStop = () => {
    setIsPlaying(false)
    // TODO: Tauriコマンドを呼び出して読み上げ停止
  }

  return (
    <div className="container">
      <h1>タネヨミくん</h1>
      <p>音声読み上げアプリケーション</p>

      <div className="text-area-container">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="読み上げたいテキストを入力してください..."
          rows={5}
          className="text-input"
        />
      </div>

      <div className="controls">
        <button
          className="btn btn-primary"
          onClick={handlePlay}
          disabled={isPlaying}
        >
          {isPlaying ? '読み上げ中...' : '読み上げ開始'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleStop}
          disabled={!isPlaying}
        >
          停止
        </button>
        <button
          className="btn btn-settings"
          onClick={() => setShowSettings(!showSettings)}
        >
          ⚙️ 設定
        </button>
      </div>

      <div className="volume-container">
        <label htmlFor="volume">音量: {volume}%</label>
        <input
          id="volume"
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="volume-slider"
        />
        <div className="volume-indicator">
          <div className="volume-bar" style={{ width: `${volume}%` }} />
        </div>
      </div>

      {showSettings && (
        <div className="settings-panel">
          <h2>設定</h2>

          <div className="settings-group">
            <label htmlFor="api-key">Cartesia API キー:</label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="APIキーを入力してください"
              className="input-field"
            />
          </div>

          <div className="settings-group">
            <label htmlFor="voice-select">音声:</label>
            <select
              id="voice-select"
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="select-field"
            >
              <option value="japanese-male-1">日本語 男性 1</option>
              <option value="japanese-female-1">日本語 女性 1</option>
              <option value="japanese-male-2">日本語 男性 2</option>
              <option value="japanese-female-2">日本語 女性 2</option>
            </select>
          </div>

          <div className="settings-group">
            <label htmlFor="speed">読み上げ速度: {speed.toFixed(1)}x</label>
            <input
              id="speed"
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="speed-slider"
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={() => {
              // TODO: 設定を保存する
              setShowSettings(false)
            }}
          >
            保存
          </button>
        </div>
      )}
    </div>
  )
}

export default App
