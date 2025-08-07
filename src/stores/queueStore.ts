/**
 * 読み上げキューの管理ストア
 */

export enum QueuePriority {
  HIGH = 3,
  NORMAL = 2,
  LOW = 1,
}

export type QueueStatus = 'pending' | 'processing' | 'completed' | 'error'

export interface QueueItem {
  id: string
  text: string
  priority: QueuePriority
  status: QueueStatus
  createdAt: Date
  completedAt?: Date
}

export class QueueStore {
  private items: Map<string, QueueItem> = new Map()
  private itemOrder: string[] = []

  /**
   * キューにアイテムを追加
   */
  addItem(
    text: string,
    priority: QueuePriority = QueuePriority.NORMAL,
  ): QueueItem {
    if (!text.trim()) {
      throw new Error('テキストを入力してください')
    }

    const item: QueueItem = {
      id: this.generateId(),
      text: text.trim(),
      priority,
      status: 'pending',
      createdAt: new Date(),
    }

    this.items.set(item.id, item)
    this.itemOrder.push(item.id)
    this.sortQueue()

    return item
  }

  /**
   * 次に処理すべきアイテムを取得
   */
  getNext(): QueueItem | undefined {
    for (const id of this.itemOrder) {
      const item = this.items.get(id)
      if (item && item.status === 'pending') {
        return item
      }
    }
    return undefined
  }

  /**
   * 指定したアイテムを取得
   */
  getItem(id: string): QueueItem | undefined {
    return this.items.get(id)
  }

  /**
   * すべてのアイテムを取得
   */
  getItems(): QueueItem[] {
    return this.itemOrder.map((id) => this.items.get(id)!).filter(Boolean)
  }

  /**
   * アイテムを削除
   */
  removeItem(id: string): void {
    this.items.delete(id)
    const index = this.itemOrder.indexOf(id)
    if (index !== -1) {
      this.itemOrder.splice(index, 1)
    }
  }

  /**
   * アイテムのステータスを更新
   */
  updateStatus(id: string, status: QueueStatus): void {
    const item = this.items.get(id)
    if (item) {
      item.status = status
      if (status === 'completed') {
        item.completedAt = new Date()
      }
    }
  }

  /**
   * キューをクリア
   */
  clear(): void {
    this.items.clear()
    this.itemOrder = []
  }

  /**
   * アイテムの順序を変更
   */
  moveItem(id: string, newIndex: number): void {
    const currentIndex = this.itemOrder.indexOf(id)
    if (currentIndex === -1) return

    this.itemOrder.splice(currentIndex, 1)
    this.itemOrder.splice(newIndex, 0, id)
  }

  /**
   * キューをJSONとして保存
   */
  saveToJSON(): string {
    return JSON.stringify(
      {
        version: '1.0',
        items: this.getItems(),
      },
      null,
      2,
    )
  }

  /**
   * JSONからキューを読み込み
   */
  loadFromJSON(json: string): void {
    try {
      const data = JSON.parse(json)
      this.clear()

      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          // 日付を再構築
          item.createdAt = new Date(item.createdAt)
          if (item.completedAt) {
            item.completedAt = new Date(item.completedAt)
          }
          this.items.set(item.id, item)
          this.itemOrder.push(item.id)
        }
        this.sortQueue()
      }
    } catch {
      throw new Error('無効なJSONフォーマットです')
    }
  }

  /**
   * IDを生成
   */
  private generateId(): string {
    return `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * キューを優先度順にソート
   */
  private sortQueue(): void {
    this.itemOrder.sort((a, b) => {
      const itemA = this.items.get(a)!
      const itemB = this.items.get(b)!

      // 優先度が高い順
      if (itemA.priority !== itemB.priority) {
        return itemB.priority - itemA.priority
      }

      // 同じ優先度なら作成日時順
      return itemA.createdAt.getTime() - itemB.createdAt.getTime()
    })
  }
}
