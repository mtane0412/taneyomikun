/**
 * 読み上げキューパネルコンポーネント
 */
import { useState, useEffect } from 'react'
import { QueueStore, QueueItem, QueuePriority } from '../stores/queueStore'
import './QueuePanel.css'

interface QueuePanelProps {
  store: QueueStore
  onAdd?: (text: string) => void
  onRemove?: (id: string) => void
  onClear?: () => void
  onPlayItem?: (item: QueueItem) => void
}

export function QueuePanel({
  store,
  onAdd,
  onRemove,
  onClear,
  onPlayItem,
}: QueuePanelProps) {
  const [items, setItems] = useState<QueueItem[]>([])
  const [newText, setNewText] = useState('')
  const [priority, setPriority] = useState(QueuePriority.NORMAL)

  useEffect(() => {
    const updateItems = () => setItems(store.getItems())
    updateItems()

    // ストアの変更を監視（実装は簡略化）
    const interval = setInterval(updateItems, 100)
    return () => clearInterval(interval)
  }, [store])

  const handleAdd = () => {
    if (newText.trim() && onAdd) {
      onAdd(newText)
      setNewText('')
    }
  }

  const getPriorityLabel = (priority: QueuePriority) => {
    switch (priority) {
      case QueuePriority.HIGH:
        return '高'
      case QueuePriority.NORMAL:
        return '中'
      case QueuePriority.LOW:
        return '低'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '待機中'
      case 'processing':
        return '処理中'
      case 'completed':
        return '完了'
      case 'error':
        return 'エラー'
      default:
        return status
    }
  }

  return (
    <div className="queue-panel">
      <h3>読み上げキュー</h3>

      <div className="queue-add">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="テキストを追加..."
          className="queue-input"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
          className="priority-select"
        >
          <option value={QueuePriority.HIGH}>高</option>
          <option value={QueuePriority.NORMAL}>中</option>
          <option value={QueuePriority.LOW}>低</option>
        </select>
        <button onClick={handleAdd} className="btn btn-primary">
          追加
        </button>
      </div>

      <div className="queue-list">
        {items.length === 0 ? (
          <p className="queue-empty">キューは空です</p>
        ) : (
          <ul>
            {items.map((item) => (
              <li
                key={item.id}
                className={`queue-item queue-item-${item.status}`}
                role="listitem"
              >
                <div className="queue-item-content">
                  <span className={`priority priority-${item.priority}`}>
                    {getPriorityLabel(item.priority)}
                  </span>
                  <span className="queue-text">{item.text}</span>
                  <span className="queue-status">
                    {getStatusLabel(item.status)}
                  </span>
                </div>
                <div className="queue-item-actions">
                  {item.status === 'pending' && onPlayItem && (
                    <button
                      onClick={() => onPlayItem(item)}
                      className="btn-icon"
                      aria-label="再生"
                    >
                      ▶
                    </button>
                  )}
                  <button
                    onClick={() => onRemove && onRemove(item.id)}
                    className="btn-icon"
                    aria-label="削除"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {items.length > 0 && onClear && (
        <div className="queue-actions">
          <button onClick={onClear} className="btn btn-secondary">
            すべてクリア
          </button>
        </div>
      )}
    </div>
  )
}
