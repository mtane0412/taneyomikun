/**
 * キューストアを管理するカスタムフック
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { QueueStore, QueuePriority } from '../stores/queueStore'

export function useQueueStore() {
  const storeRef = useRef(new QueueStore())
  const [updateTrigger, setUpdateTrigger] = useState(0)

  // コンポーネントを再レンダリングするためのトリガー
  const triggerUpdate = useCallback(() => {
    setUpdateTrigger((prev) => prev + 1)
  }, [])

  const addItem = useCallback(
    (text: string, priority: QueuePriority = QueuePriority.NORMAL) => {
      const item = storeRef.current.addItem(text, priority)
      triggerUpdate()
      return item
    },
    [triggerUpdate],
  )

  const removeItem = useCallback(
    (id: string) => {
      storeRef.current.removeItem(id)
      triggerUpdate()
    },
    [triggerUpdate],
  )

  const updateStatus = useCallback(
    (id: string, status: 'pending' | 'processing' | 'completed' | 'error') => {
      storeRef.current.updateStatus(id, status)
      triggerUpdate()
    },
    [triggerUpdate],
  )

  const getNext = useCallback(() => {
    return storeRef.current.getNext()
  }, [])

  const clear = useCallback(() => {
    storeRef.current.clear()
    triggerUpdate()
  }, [triggerUpdate])

  const getItems = useCallback(() => {
    return storeRef.current.getItems()
  }, [])

  const saveQueue = useCallback(() => {
    const json = storeRef.current.saveToJSON()
    window.localStorage.setItem('taneyomikun-queue', json)
  }, [])

  const loadQueue = useCallback(() => {
    const json = window.localStorage.getItem('taneyomikun-queue')
    if (json) {
      try {
        storeRef.current.loadFromJSON(json)
        triggerUpdate()
      } catch (error) {
        console.error('キューの読み込みに失敗しました:', error)
      }
    }
  }, [triggerUpdate])

  // 初回マウント時にキューを読み込む
  useEffect(() => {
    loadQueue()
  }, [])

  return {
    store: storeRef.current,
    items: getItems(),
    addItem,
    removeItem,
    updateStatus,
    getNext,
    clear,
    saveQueue,
    loadQueue,
    updateTrigger,
  }
}
