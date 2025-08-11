/**
 * メインアプリケーションコンポーネント
 * 音声読み上げアプリケーションのメインUI
 **/
import { useState, useEffect, useRef } from 'react'
import { listen } from '@tauri-apps/api/event'
import * as tts from './utils/tts'
import { AudioPlayer } from './utils/audioPlayer'
import { HistoryPanel } from './components/HistoryPanel'
import { useHistoryStore } from './stores/historyStore'
import { useLanguageStore } from './stores/languageStore'
import { LANGUAGE_OPTIONS } from './types/language'
import { Play, Square, Settings } from 'lucide-react'
import { VolumeControl } from './components/VolumeControl'
import { SpeedControl } from './components/SpeedControl'
import { LanguageFlag } from './components/LanguageFlag'
import { SettingsModal } from './components/SettingsModal'
import { ProfileIcon } from './components/ProfileIcon'

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
  const audioPlayerRef = useRef<AudioPlayer | null>(null)
  const [volume, setVolume] = useState(50)
  const [showSettings, setShowSettings] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [voiceSpeed, setVoiceSpeed] = useState(0)
  const historyStore = useHistoryStore()
  const languageStore = useLanguageStore()
  const hasApiKeyRef = useRef(false)

  // hasApiKeyの変更をrefに反映
  useEffect(() => {
    hasApiKeyRef.current = hasApiKey
  }, [hasApiKey])

  // APIキーの存在を再確認する関数
  const checkApiKeyStatus = async () => {
    log('Checking API key status...')
    const exists = await tts.checkApiKey()
    log('API key exists:', exists)
    setHasApiKey(exists)
  }

  const playText = async (textToPlay: string, overrideLanguage?: string) => {
    if (!hasApiKeyRef.current) {
      window.alert('APIキーを設定してください')
      setShowSettings(true)
      return
    }

    try {
      log('Starting playback')
      setIsPlaying(true)

      // 言語設定を取得（オーバーライドがあればそれを使用）
      const targetLanguage = overrideLanguage || languageStore.language
      const languageOption =
        LANGUAGE_OPTIONS.find((opt) => opt.code === targetLanguage) ||
        LANGUAGE_OPTIONS.find((opt) => opt.code === languageStore.language)!

      log('Updating TTS config')
      const config = {
        model_id: 'sonic-2',
        voice_id: languageOption.voiceId,
        speed: 1.0,
        volume: volume / 100,
        language: languageOption.code,
        voice_speed: voiceSpeed,
      }
      log('TTS config to be sent:', config)
      window.console.log('[App] TTS config:', config)
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

    // 履歴に追加
    const historyItem = historyStore.addItem(text)

    try {
      await playText(text)
      historyStore.updateStatus(historyItem.id, 'completed')
    } catch (err) {
      historyStore.updateStatus(historyItem.id, 'error')
      throw err
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
      log('Playback stopped')
    } catch (err) {
      error('停止エラー:', err)
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
      })

      const unlistenAudioError = await listen<string>(
        'audio-error',
        (event) => {
          error('音声エラー:', event.payload)
          window.alert(`音声エラー: ${event.payload}`)
          setIsPlaying(false)
        },
      )

      // HTTPリクエストのイベントリスナー
      log('Setting up http-tts-request listener')
      const unlistenHttpRequest = await listen<{
        text: string
        priority?: string
        voice_speed?: number
        language?: string
      }>('http-tts-request', async (event) => {
        window.console.log('[App] Received HTTP TTS request:', event.payload)
        window.console.log('[App] Current voiceSpeed:', voiceSpeed)
        log('Received HTTP TTS request:', event.payload)
        log('Current voiceSpeed:', voiceSpeed)

        // 履歴に追加
        const historyItem = historyStore.addItem(event.payload.text)
        window.console.log('[App] Added to history:', historyItem)
        window.console.log('[App] Has API key:', hasApiKeyRef.current)

        // HTTPリクエストからvoice_speedを一時的に設定（未指定の場合は現在の設定値を使用）
        const originalVoiceSpeed = voiceSpeed
        if (
          event.payload.voice_speed !== undefined &&
          event.payload.voice_speed !== null
        ) {
          setVoiceSpeed(event.payload.voice_speed)
        }

        // 即座に読み上げ開始（現在の読み上げがあれば中断）
        try {
          // 現在再生中の音声を停止
          window.console.log('[App] Stopping current playback...')
          await tts.stopSpeech()
          if (audioPlayerRef.current) {
            audioPlayerRef.current.stop()
          }
          setIsPlaying(false)

          // 少し待機してから新しい読み上げを開始
          await new Promise((resolve) => window.setTimeout(resolve, 100))

          window.console.log('[App] Starting new playback...')
          // HTTPリクエストで言語が指定されている場合はそれを使用
          await playText(event.payload.text, event.payload.language)
          window.console.log('[App] Playback completed')
          historyStore.updateStatus(historyItem.id, 'completed')
        } catch (err) {
          window.console.error('[App] Playback error:', err)
          error('Playback error:', err)
          historyStore.updateStatus(historyItem.id, 'error')
        } finally {
          // 元の設定に戻す
          if (
            event.payload.voice_speed !== undefined &&
            event.payload.voice_speed !== null
          ) {
            setVoiceSpeed(originalVoiceSpeed)
          }
        }
      })
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
      <h1 className="system-title-large">Taneyomi-kun</h1>
      <p
        className="system-body-secondary"
        style={{
          marginTop: '-16px',
          marginBottom: '32px',
          color: 'var(--system-label-secondary)',
        }}
      >
        Text to Speech in Tanenobu voice
      </p>

      <div className="speech-bubble-container">
        <div className="profile-icon-wrapper">
          <ProfileIcon size={80} />
        </div>

        <div className="speech-bubble">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="読み上げたいテキストを入力してください..."
            rows={5}
          />

          <div className="speech-bubble-controls">
            <button
              className="btn btn-primary icon-btn"
              onClick={handlePlay}
              disabled={isPlaying || !text.trim()}
              title="読み上げ開始"
            >
              <Play size={24} />
            </button>
            <button
              className="btn btn-secondary icon-btn"
              onClick={handleStop}
              disabled={!isPlaying}
              title="停止"
            >
              <Square size={20} />
            </button>
            <VolumeControl volume={volume} onChange={setVolume} />
            <SpeedControl speed={voiceSpeed} onChange={setVoiceSpeed} />
            <LanguageFlag />
            <button
              className="btn btn-settings icon-btn"
              onClick={() => setShowSettings(!showSettings)}
              title="設定"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onApiKeyUpdated={checkApiKeyStatus}
      />

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
          } catch {
            historyStore.updateStatus(newItem.id, 'error')
          }
        }}
      />
    </div>
  )
}

export default App
