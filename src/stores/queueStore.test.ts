/**
 * 読み上げキューストアのテスト
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { QueueStore, QueuePriority } from './queueStore'

describe('QueueStore', () => {
  let store: QueueStore

  beforeEach(() => {
    store = new QueueStore()
  })

  describe('addItem', () => {
    it('通常優先度のアイテムを追加できる', () => {
      const item = store.addItem('テスト1')
      expect(item.text).toBe('テスト1')
      expect(item.priority).toBe(QueuePriority.NORMAL)
      expect(item.status).toBe('pending')
      expect(store.getItems()).toHaveLength(1)
    })

    it('高優先度のアイテムを追加できる', () => {
      const item = store.addItem('緊急', QueuePriority.HIGH)
      expect(item.priority).toBe(QueuePriority.HIGH)
    })

    it('低優先度のアイテムを追加できる', () => {
      const item = store.addItem('後で', QueuePriority.LOW)
      expect(item.priority).toBe(QueuePriority.LOW)
    })

    it('空のテキストは追加できない', () => {
      expect(() => store.addItem('')).toThrow('テキストを入力してください')
    })
  })

  describe('getNext', () => {
    it('優先度順に取得できる', () => {
      store.addItem('低優先度', QueuePriority.LOW)
      store.addItem('通常優先度', QueuePriority.NORMAL)
      store.addItem('高優先度', QueuePriority.HIGH)

      const next = store.getNext()
      expect(next?.text).toBe('高優先度')
    })

    it('同じ優先度の場合は追加順に取得できる', () => {
      store.addItem('1番目', QueuePriority.NORMAL)
      store.addItem('2番目', QueuePriority.NORMAL)

      const next = store.getNext()
      expect(next?.text).toBe('1番目')
    })

    it('空のキューからはundefinedを返す', () => {
      expect(store.getNext()).toBeUndefined()
    })

    it('処理中のアイテムはスキップされる', () => {
      const item1 = store.addItem('処理中')
      const item2 = store.addItem('待機中')

      store.updateStatus(item1.id, 'processing')

      const next = store.getNext()
      expect(next?.id).toBe(item2.id)
    })
  })

  describe('removeItem', () => {
    it('指定したアイテムを削除できる', () => {
      const item = store.addItem('削除対象')
      expect(store.getItems()).toHaveLength(1)

      store.removeItem(item.id)
      expect(store.getItems()).toHaveLength(0)
    })

    it('存在しないIDでもエラーにならない', () => {
      expect(() => store.removeItem('invalid-id')).not.toThrow()
    })
  })

  describe('updateStatus', () => {
    it('ステータスを更新できる', () => {
      const item = store.addItem('テスト')

      store.updateStatus(item.id, 'processing')
      expect(store.getItem(item.id)?.status).toBe('processing')

      store.updateStatus(item.id, 'completed')
      expect(store.getItem(item.id)?.status).toBe('completed')
    })
  })

  describe('clear', () => {
    it('すべてのアイテムをクリアできる', () => {
      store.addItem('アイテム1')
      store.addItem('アイテム2')
      store.addItem('アイテム3')
      expect(store.getItems()).toHaveLength(3)

      store.clear()
      expect(store.getItems()).toHaveLength(0)
    })
  })

  describe('moveItem', () => {
    it('アイテムの順序を変更できる', () => {
      const item1 = store.addItem('1番目')
      const item2 = store.addItem('2番目')
      const item3 = store.addItem('3番目')

      store.moveItem(item3.id, 0)

      const items = store.getItems()
      expect(items[0].id).toBe(item3.id)
      expect(items[1].id).toBe(item1.id)
      expect(items[2].id).toBe(item2.id)
    })
  })

  describe('saveToJSON/loadFromJSON', () => {
    it('JSONとしてエクスポート/インポートできる', () => {
      store.addItem('アイテム1', QueuePriority.HIGH)
      store.addItem('アイテム2', QueuePriority.LOW)

      const json = store.saveToJSON()
      const parsed = JSON.parse(json)

      expect(parsed.items).toHaveLength(2)
      expect(parsed.version).toBe('1.0')

      const newStore = new QueueStore()
      newStore.loadFromJSON(json)

      expect(newStore.getItems()).toHaveLength(2)
      expect(newStore.getItems()[0].text).toBe('アイテム1')
    })
  })
})
