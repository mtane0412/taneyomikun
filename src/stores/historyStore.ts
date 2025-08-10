/**
 * 読み上げ履歴ストア
 * 読み上げたテキストの履歴を管理
 */

import { create } from 'zustand'

export interface HistoryItem {
  id: string
  text: string
  timestamp: Date
  status: 'completed' | 'error' | 'processing'
}

interface HistoryStore {
  items: HistoryItem[]
  maxItems: number
  addItem: (text: string) => HistoryItem
  updateStatus: (id: string, status: HistoryItem['status']) => void
  clearHistory: () => void
  removeItem: (id: string) => void
}

export const useHistoryStore = create<HistoryStore>((set) => ({
  items: [],
  maxItems: 100, // 最大100件まで保持

  addItem: (text: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      text,
      timestamp: new Date(),
      status: 'processing',
    }

    set((state) => {
      const newItems = [newItem, ...state.items]
      // 最大件数を超えたら古いものを削除
      if (newItems.length > state.maxItems) {
        newItems.splice(state.maxItems)
      }
      return { items: newItems }
    })

    return newItem
  },

  updateStatus: (id: string, status: HistoryItem['status']) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, status } : item,
      ),
    }))
  },

  clearHistory: () => {
    set({ items: [] })
  },

  removeItem: (id: string) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }))
  },
}))
