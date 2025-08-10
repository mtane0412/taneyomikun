/**
 * メインアプリケーションコンポーネント
 * 音声読み上げアプリケーションのメインUI
 **/
import { useState, useEffect, useRef } from 'react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import * as tts from './utils/tts'
import { AudioPlayer } from './utils/audioPlayer'
import { HistoryPanel } from './components/HistoryPanel'
import { useHistoryStore } from './stores/historyStore'

// デバッグログの有効化
const DEBUG = true
const log = (...args: unknown[]) => {
  if (DEBUG) {
    window.console.log('[App]', ...args)
  }
}
const error = (...args: unknown[]) => window.console.error('[App]', ...args)

function App() {
  const [text, setText] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const audioPlayerRef = useRef<AudioPlayer | null>(null)
  const [volume, setVolume] = useState(50)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [speed, setSpeed] = useState(1.0)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const historyStore = useHistoryStore()
  const [httpPort, setHttpPort] = useState(50080)
  const [httpEnabled, setHttpEnabled] = useState(true)
  const hasApiKeyRef = useRef(false)

  // hasApiKeyの変更をrefに反映
  useEffect(() => {
    hasApiKeyRef.current = hasApiKey
  }, [hasApiKey])

  const playText = async (textToPlay: string) => {
    if (!hasApiKeyRef.current) {
      window.alert('APIキーを設定してください')
      setShowSettings(true)
      return
    }

    try {
      log('Starting playback')
      setIsPlaying(true)

      log('Updating TTS config')
      const config = {
        model_id: 'sonic-2',
        voice_id: 'fb25b315-dfba-444f-b99d-4c8535672cb7',
        speed,
        volume: volume / 100,
        language: 'ja',
      }
      await tts.updateTTSConfig(config)

      // 音声プレイヤーを初期化
      if (!audioPlayerRef.current) {
        log('Creating new AudioPlayer')
        audioPlayerRef.current = new AudioPlayer()
      }
      audioPlayerRef.current.setVolume(volume / 100)
      log('AudioPlayer ready, volume set to:', volume / 100)

      log('Starting TTS synthesis')
      await tts.synthesizeSpeech(textToPlay)
      log('TTS synthesis command sent')
    } catch (err) {
      error('読み上げエラー:', err)
      window.alert(`読み上げ中にエラーが発生しました: ${err}`)
      setIsPlaying(false)
      throw err
    }
  }

  const handlePlay = async () => {
    log('handlePlay called')
    if (!text.trim()) {
      window.alert('読み上げるテキストを入力してください')
      return
    }
    await playText(text)
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

  const handleSaveHttpConfig = async () => {
    try {
      log('Saving HTTP config', { port: httpPort, enabled: httpEnabled })
      await invoke('update_http_config', {
        port: httpPort,
        enabled: httpEnabled,
      })
      log('HTTP config saved successfully')
      window.alert('HTTPサーバー設定を保存しました')
    } catch (err) {
      error('HTTPサーバー設定保存エラー:', err)
      window.alert(`HTTPサーバー設定の保存に失敗しました: ${err}`)
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

    // HTTPサーバー設定の読み込み
    log('Loading HTTP server config')
    invoke<{ port: number; enabled: boolean }>('get_http_config')
      .then((config) => {
        log('HTTP config loaded:', config)
        setHttpPort(config.port)
        setHttpEnabled(config.enabled)
      })
      .catch((err) => {
        error('Failed to load HTTP config:', err)
      })

    // 音声データのイベントリスナーを設定
    log('Setting up event listeners')
    const setupListeners = async () => {
      const unlistenAudioChunk = await listen<string>(
        'audio-chunk',
        (event) => {
          log(
            'Received audio-chunk event, payload length:',
            event.payload.length,
          )
          if (audioPlayerRef.current) {
            audioPlayerRef.current.appendAudioChunk(event.payload)
          } else {
            log('No audio player available for chunk')
          }
        },
      )

      const unlistenAudioComplete = await listen('audio-complete', async () => {
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

      // HTTPリクエストのイベントリスナー
      log('Setting up http-tts-request listener')
      const unlistenHttpRequest = await listen<{ text: string; priority?: string }>(
        'http-tts-request',
        async (event) => {
          window.console.log('[App] Received HTTP TTS request:', event.payload)
          log('Received HTTP TTS request:', event.payload)
          
          // 履歴に追加
          const historyItem = historyStore.addItem(event.payload.text)
          window.console.log('[App] Added to history:', historyItem)
          window.console.log('[App] Has API key:', hasApiKeyRef.current)
          
          // 即座に読み上げ開始（現在の読み上げがあれば中断）
          try {
            // 現在再生中の音声を停止
            window.console.log('[App] Stopping current playback...')
            await tts.stopSpeech()
            if (audioPlayerRef.current) {
              audioPlayerRef.current.stop()
            }
            setIsPlaying(false)
            setIsPaused(false)
            
            // 少し待機してから新しい読み上げを開始
            await new Promise(resolve => setTimeout(resolve, 100))
            
            window.console.log('[App] Starting new playback...')
            await playText(event.payload.text)
            window.console.log('[App] Playback completed')
            historyStore.updateStatus(historyItem.id, 'completed')
          } catch (err) {
            window.console.error('[App] Playback error:', err)
            error('Playback error:', err)
            historyStore.updateStatus(historyItem.id, 'error')
          }
        },
      )
      log('http-tts-request listener registered successfully')

      // クリーンアップ
      return () => {
        log('Cleaning up event listeners')
        unlistenAudioChunk()
        unlistenAudioComplete()
        unlistenAudioError()
        unlistenHttpRequest()
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
        <button
          className="btn btn-secondary"
          onClick={() => setShowHistory(!showHistory)}
        >
          📋 履歴 ({historyStore.items.length})
        </button>
        <button
          className="btn btn-secondary"
          onClick={async () => {
            try {
              const result = await invoke('test_event_emit')
              log('Test event result:', result)
            } catch (err) {
              error('Test event error:', err)
            }
          }}
        >
          🧪 テスト
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
                <span
                  style={{
                    marginLeft: '8px',
                    fontSize: '0.9em',
                    color: '#4CAF50',
                    fontWeight: 'normal',
                  }}
                >
                  ✓ 設定済み
                </span>
              )}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="api-key"
                type="password"
                value={
                  hasApiKey && !apiKey ? '••••••••••••••••••••••••' : apiKey
                }
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

          <div className="settings-group">
            <label htmlFor="http-enabled">
              HTTPサーバー
              {httpEnabled && (
                <span style={{ marginLeft: '8px', color: '#4CAF50', fontSize: '0.9em' }}>
                  ✓ 有効 (ポート: {httpPort})
                </span>
              )}
            </label>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9em' }}>
                <input
                  id="http-enabled"
                  type="checkbox"
                  checked={httpEnabled}
                  onChange={(e) => setHttpEnabled(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                HTTPサーバーを有効にする
              </label>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label htmlFor="http-port" style={{ fontSize: '0.9em' }}>
                ポート:
              </label>
              <input
                id="http-port"
                type="number"
                min="1024"
                max="65535"
                value={httpPort}
                onChange={(e) => setHttpPort(Number(e.target.value))}
                disabled={!httpEnabled}
                className="input-field"
                style={{ width: '100px' }}
              />
              <button 
                className="btn btn-secondary" 
                onClick={handleSaveHttpConfig}
                disabled={!httpEnabled}
              >
                保存
              </button>
            </div>
            {httpEnabled && (
              <p style={{ fontSize: '0.8em', color: '#666', marginTop: '8px' }}>
                http://localhost:{httpPort}/tts にPOSTリクエストで文字列を送信できます
              </p>
            )}
          </div>

          <button
            className="btn btn-primary"
            onClick={() => setShowSettings(false)}
          >
            閉じる
          </button>
        </div>
      )}

      {showHistory && (
        <HistoryPanel
          items={historyStore.items}
          onClear={() => {
            if (window.confirm('すべての履歴を削除しますか？')) {
              historyStore.clearHistory()
            }
          }}
          onRemove={(id) => {
            historyStore.removeItem(id)
          }}
          onReplay={async (item) => {
            if (isPlaying) {
              await handleStop()
            }
            const newItem = historyStore.addItem(item.text)
            try {
              await playText(item.text)
              historyStore.updateStatus(newItem.id, 'completed')
            } catch (err) {
              historyStore.updateStatus(newItem.id, 'error')
            }
          }}
        />
      )}
    </div>
  )
}

export default App
