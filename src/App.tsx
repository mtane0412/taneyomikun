/**
 * メインアプリケーションコンポーネント
 * 音声読み上げアプリケーションのメインUI
 **/
import { useState, useEffect, useRef } from 'react'
import { listen } from '@tauri-apps/api/event'
import * as tts from './utils/tts'
import { AudioPlayer } from './utils/audioPlayer'

// デバッグログの有効化
const DEBUG = true
const log = (...args: any[]) => DEBUG && console.log('[App]', ...args)
const error = (...args: any[]) => console.error('[App]', ...args)

function App() {
  const [text, setText] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const audioPlayerRef = useRef<AudioPlayer | null>(null)
  const [volume, setVolume] = useState(50)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [selectedVoice, setSelectedVoice] = useState(
    'a0e99841-438c-4a64-b679-ae501e7d6091',
  )
  const [speed, setSpeed] = useState(1.0)
  const [hasApiKey, setHasApiKey] = useState(false)

  const handlePlay = async () => {
    log('handlePlay called')
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
      log('Starting playback')
      setIsPlaying(true)
      
      log('Updating TTS config')
      await tts.updateTTSConfig({
        voice_id: selectedVoice,
        speed,
        volume: volume / 100,
        language: 'ja',
      })

      // 音声プレイヤーを初期化
      if (!audioPlayerRef.current) {
        log('Creating new AudioPlayer')
        audioPlayerRef.current = new AudioPlayer()
      }
      audioPlayerRef.current.setVolume(volume / 100)
      log('AudioPlayer ready, volume set to:', volume / 100)

      log('Starting TTS synthesis')
      await tts.synthesizeSpeech(text)
      log('TTS synthesis command sent')
    } catch (err) {
      error('読み上げエラー:', err)
      window.alert(`読み上げ中にエラーが発生しました: ${err}`)
      setIsPlaying(false)
    }
  }

  const handleStop = async () => {
    log('handleStop called')
    try {
      await tts.stopSpeech()
      if (audioPlayerRef.current) {
        audioPlayerRef.current.stop()
      }
      setIsPlaying(false)
      setIsPaused(false)
      log('Playback stopped')
    } catch (err) {
      error('停止エラー:', err)
    }
  }

  const handlePause = async () => {
    log('handlePause called, isPaused:', isPaused)
    if (!audioPlayerRef.current) return

    try {
      if (isPaused) {
        audioPlayerRef.current.play()
        setIsPaused(false)
        log('Playback resumed')
      } else {
        audioPlayerRef.current.pause()
        log('Playback paused')
        setIsPaused(true)
      }
    } catch (error) {
      window.console.error('一時停止/再開エラー:', error)
    }
  }

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      window.alert('APIキーを入力してください')
      return
    }

    try {
      log('Saving API key')
      await tts.setApiKey(apiKey)
      log('API key saved successfully')
      setHasApiKey(true)
      setApiKey('') // セキュリティのためクリア
      window.alert('APIキーを保存しました')
    } catch (err) {
      error('APIキー保存エラー:', err)
      window.alert(`APIキーの保存に失敗しました: ${err}`)
    }
  }

  useEffect(() => {
    log('Component mounted, setting up')
    
    // APIキーの存在確認
    log('Checking API key')
    tts.checkApiKey().then((exists) => {
      log('API key check result:', exists)
      setHasApiKey(exists)
    })

    // 音声データのイベントリスナーを設定
    log('Setting up event listeners')
    const setupListeners = async () => {
      const unlistenAudioChunk = await listen<string>(
        'audio-chunk',
        (event) => {
          log('Received audio-chunk event, payload length:', event.payload.length)
          if (audioPlayerRef.current) {
            audioPlayerRef.current.appendAudioChunk(event.payload)
          } else {
            log('No audio player available for chunk')
          }
        },
      )

      const unlistenAudioComplete = await listen('audio-complete', () => {
        log('Received audio-complete event')
        setIsPlaying(false)
        setIsPaused(false)
      })

      const unlistenAudioError = await listen<string>(
        'audio-error',
        (event) => {
          error('音声エラー:', event.payload)
          window.alert(`音声エラー: ${event.payload}`)
          setIsPlaying(false)
          setIsPaused(false)
        },
      )

      // クリーンアップ
      return () => {
        log('Cleaning up event listeners')
        unlistenAudioChunk()
        unlistenAudioComplete()
        unlistenAudioError()
        if (audioPlayerRef.current) {
          audioPlayerRef.current.close()
        }
      }
    }

    const cleanup = setupListeners()

    return () => {
      cleanup.then((fn) => fn())
    }
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
          onClick={handlePause}
          disabled={!isPlaying}
        >
          {isPaused ? '再開' : '一時停止'}
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
            <label htmlFor="api-key">
              Cartesia API キー:
              {hasApiKey && (
                <span style={{ 
                  marginLeft: '8px', 
                  fontSize: '0.9em', 
                  color: '#4CAF50',
                  fontWeight: 'normal'
                }}>
                  ✓ 設定済み
                </span>
              )}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="api-key"
                type="password"
                value={hasApiKey && !apiKey ? '••••••••••••••••••••••••' : apiKey}
                onChange={(e) => {
                  const newValue = e.target.value
                  // マスク文字列の場合は編集を開始したらクリア
                  if (newValue !== '••••••••••••••••••••••••') {
                    setApiKey(newValue)
                  } else if (!hasApiKey) {
                    setApiKey('')
                  }
                }}
                placeholder={!hasApiKey ? 'APIキーを入力してください' : ''}
                className="input-field"
                style={{ flex: 1 }}
              />
              <button className="btn btn-secondary" onClick={handleSaveApiKey}>
                {hasApiKey ? '更新' : '保存'}
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
