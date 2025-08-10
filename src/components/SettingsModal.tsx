/**
 * 設定モーダルコンポーネント
 * APIキーやHTTPサーバーの設定を行うモーダルダイアログ
 */
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import * as tts from '../utils/tts'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const log = (...args: unknown[]) =>
  window.console.log('[SettingsModal]', ...args)
const error = (...args: unknown[]) =>
  window.console.error('[SettingsModal]', ...args)

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [httpPort, setHttpPort] = useState(50080)
  const [httpEnabled, setHttpEnabled] = useState(true)

  useEffect(() => {
    if (isOpen) {
      // APIキーの存在確認
      tts.checkApiKey().then((exists) => {
        setHasApiKey(exists)
      })

      // HTTPサーバー設定の読み込み
      invoke<{ port: number; enabled: boolean }>('get_http_config')
        .then((config) => {
          setHttpPort(config.port)
          setHttpEnabled(config.enabled)
        })
        .catch((err) => {
          error('Failed to load HTTP config:', err)
        })
    }
  }, [isOpen])

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      window.alert('APIキーを入力してください')
      return
    }

    try {
      log('Saving API key')
      await tts.setApiKey(apiKey)
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
      window.alert('HTTPサーバー設定を保存しました')
    } catch (err) {
      error('HTTPサーバー設定保存エラー:', err)
      window.alert(`HTTPサーバー設定の保存に失敗しました: ${err}`)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="modal-overlay"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
      />

      {/* モーダル本体 */}
      <div
        className="modal-content animate-fade-in"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'var(--system-background)',
          borderRadius: '12px',
          padding: '32px',
          minWidth: '400px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
          zIndex: 1001,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <h2 className="system-headline" style={{ margin: 0 }}>
            設定
          </h2>
          <button
            className="btn-icon"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '4px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor =
                'var(--system-fill-secondary)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = 'transparent')
            }
          >
            <X size={24} color="var(--system-label)" />
          </button>
        </div>

        {/* API キー設定 */}
        <div className="settings-group" style={{ marginBottom: '24px' }}>
          <label htmlFor="api-key" style={{ fontWeight: 600 }}>
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
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input
              id="api-key"
              type="password"
              value={hasApiKey && !apiKey ? '••••••••••••••••••••••••' : apiKey}
              onChange={(e) => {
                const newValue = e.target.value
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

        {/* HTTPサーバー設定 */}
        <div className="settings-group" style={{ marginBottom: '24px' }}>
          <label htmlFor="http-enabled" style={{ fontWeight: 600 }}>
            HTTPサーバー
            {httpEnabled && (
              <span
                style={{
                  marginLeft: '8px',
                  color: '#4CAF50',
                  fontSize: '0.9em',
                  fontWeight: 'normal',
                }}
              >
                ✓ 有効 (ポート: {httpPort})
              </span>
            )}
          </label>
          <div style={{ marginTop: '12px', marginBottom: '12px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '0.9em',
                cursor: 'pointer',
              }}
            >
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
              http://localhost:{httpPort}/tts
              にPOSTリクエストで文字列を送信できます
            </p>
          )}
        </div>

        {/* 閉じるボタン */}
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <button className="btn btn-primary" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </>
  )
}
