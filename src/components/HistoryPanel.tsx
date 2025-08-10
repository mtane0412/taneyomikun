/**
 * 読み上げ履歴パネルコンポーネント
 * 読み上げた履歴を表示・管理する
 */

import React from 'react'
import { HistoryItem } from '../stores/historyStore'

interface HistoryPanelProps {
  items: HistoryItem[]
  onClear: () => void
  onRemove: (id: string) => void
  onReplay?: (item: HistoryItem) => void
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  items,
  onClear,
  onRemove,
  onReplay
}) => {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getStatusIcon = (status: HistoryItem['status']) => {
    switch (status) {
      case 'completed':
        return '✅'
      case 'error':
        return '❌'
      case 'processing':
        return '🔄'
    }
  }

  return (
    <div className="history-panel">
      <div className="history-header">
        <h3>読み上げ履歴</h3>
        <button
          className="btn btn-secondary"
          onClick={onClear}
          disabled={items.length === 0}
        >
          履歴をクリア
        </button>
      </div>
      
      {items.length === 0 ? (
        <div className="history-empty">
          <p>履歴がありません</p>
        </div>
      ) : (
        <div className="history-list">
          {items.map((item) => (
            <div key={item.id} className="history-item">
              <div className="history-item-header">
                <span className="history-time">{formatTime(item.timestamp)}</span>
                <span className="history-status">{getStatusIcon(item.status)}</span>
              </div>
              <div className="history-item-text">{item.text}</div>
              <div className="history-item-actions">
                {onReplay && item.status !== 'processing' && (
                  <button
                    className="btn btn-small"
                    onClick={() => onReplay(item)}
                  >
                    再生
                  </button>
                )}
                <button
                  className="btn btn-small btn-danger"
                  onClick={() => onRemove(item.id)}
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}