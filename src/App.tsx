/**
 * メインアプリケーションコンポーネント
 * 音声読み上げアプリケーションのメインUI
 **/
import { useState, useEffect } from 'react'
import { tauriApi, type VoiceInfo } from './utils/tauriApi'

function App() {
  const [text, setText] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(50)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [selectedVoice, setSelectedVoice] = useState('sonic')
  const [speed, setSpeed] = useState(1.0)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [voices, setVoices] = useState<VoiceInfo[]>([])
  const [isLoadingVoices, setIsLoadingVoices] = useState(false)

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
      await tauriApi.synthesizeText(text, {
        voice_id: selectedVoice,
        speed,
        volume: volume / 100,
        language: 'ja',
      })
    } catch (error) {
      window.console.error('読み上げエラー:', error)
      window.alert(`読み上げ中にエラーが発生しました: ${error}`)
    } finally {
      setIsPlaying(false)
    }
  }

  const handleStop = async () => {
    try {
      await tauriApi.stopSynthesis()
      setIsPlaying(false)
    } catch (error) {
      window.console.error('停止エラー:', error)
    }
  }

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      window.alert('APIキーを入力してください')
      return
    }

    try {
      await tauriApi.saveApiKey(apiKey)
      setHasApiKey(true)
      setApiKey('') // セキュリティのためクリア
      await loadVoices()
      window.alert('APIキーを保存しました')
    } catch (error) {
      window.console.error('APIキー保存エラー:', error)
      window.alert(`APIキーの保存に失敗しました: ${error}`)
    }
  }

  const loadVoices = async () => {
    setIsLoadingVoices(true)
    try {
      const voiceList = await tauriApi.getVoices()
      setVoices(voiceList)
      if (
        voiceList.length > 0 &&
        !voiceList.find((v) => v.id === selectedVoice)
      ) {
        setSelectedVoice(voiceList[0].id)
      }
    } catch (error) {
      window.console.error('音声リスト取得エラー:', error)
    } finally {
      setIsLoadingVoices(false)
    }
  }

  useEffect(() => {
    // APIキーの存在確認
    tauriApi.checkApiKey().then((exists) => {
      setHasApiKey(exists)
      if (exists) {
        loadVoices()
      }
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
              disabled={isLoadingVoices || voices.length === 0}
            >
              {isLoadingVoices ? (
                <option>読み込み中...</option>
              ) : voices.length === 0 ? (
                <option>APIキーを設定してください</option>
              ) : (
                voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} ({voice.language})
                  </option>
                ))
              )}
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
