/**
 * メインアプリケーションコンポーネント
 * 音声読み上げアプリケーションのメインUI
 **/
import { useState, useEffect } from 'react'
import * as tts from './utils/tts'

function App() {
  const [text, setText] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(50)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [selectedVoice, setSelectedVoice] = useState(
    'a0e99841-438c-4a64-b679-ae501e7d6091',
  )
  const [speed, setSpeed] = useState(1.0)
  const [hasApiKey, setHasApiKey] = useState(false)

  const handlePlay = async () => {
    if (!text.trim()) {
      window.alert('読み上げるテキストを入力してください')
      return
    }
    if (!hasApiKey) {
      window.alert('APIキーを設定してください')
      setShowSettings(true)
      return
    }

    try {
      setIsPlaying(true)
      await tts.updateTTSConfig({
        voice_id: selectedVoice,
        speed,
        volume: volume / 100,
        language: 'ja',
      })
      await tts.synthesizeSpeech(text)
    } catch (error) {
      window.console.error('読み上げエラー:', error)
      window.alert(`読み上げ中にエラーが発生しました: ${error}`)
    } finally {
      setIsPlaying(false)
    }
  }

  const handleStop = async () => {
    // TODO: 停止機能の実装
    setIsPlaying(false)
  }

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      window.alert('APIキーを入力してください')
      return
    }

    try {
      await tts.setApiKey(apiKey)
      setHasApiKey(true)
      setApiKey('') // セキュリティのためクリア
      window.alert('APIキーを保存しました')
    } catch (error) {
      window.console.error('APIキー保存エラー:', error)
      window.alert(`APIキーの保存に失敗しました: ${error}`)
    }
  }

  useEffect(() => {
    // APIキーの存在確認
    tts.checkApiKey().then((exists) => {
      setHasApiKey(exists)
    })
  }, [])

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
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  hasApiKey ? 'APIキー設定済み' : 'APIキーを入力してください'
                }
                className="input-field"
                style={{ flex: 1 }}
              />
              <button className="btn btn-secondary" onClick={handleSaveApiKey}>
                保存
              </button>
            </div>
          </div>

          <div className="settings-group">
            <label htmlFor="voice-select">音声:</label>
            <select
              id="voice-select"
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="select-field"
            >
              <option value="a0e99841-438c-4a64-b679-ae501e7d6091">
                日本語 (女性)
              </option>
              <option value="95856005-0332-41b0-935f-352e296aa0df">
                日本語 (男性)
              </option>
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
            onClick={() => setShowSettings(false)}
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  )
}

export default App
