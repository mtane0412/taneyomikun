/**
 * キューパネルコンポーネントのテスト
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueuePanel } from './QueuePanel'
import { QueueStore } from '../stores/queueStore'

describe('QueuePanel', () => {
  it('キューアイテムを表示できる', () => {
    const store = new QueueStore()
    store.addItem('テスト1')
    store.addItem('テスト2')

    render(<QueuePanel store={store} />)

    expect(screen.getByText('テスト1')).toBeTruthy()
    expect(screen.getByText('テスト2')).toBeTruthy()
  })

  it('新しいアイテムを追加できる', () => {
    const store = new QueueStore()
    const onAdd = vi.fn()

    render(<QueuePanel store={store} onAdd={onAdd} />)

    const input = screen.getByPlaceholderText('テキストを追加...')
    const addButton = screen.getByText('追加')

    fireEvent.change(input, { target: { value: '新しいテキスト' } })
    fireEvent.click(addButton)

    expect(onAdd).toHaveBeenCalledWith('新しいテキスト')
  })

  it('アイテムを削除できる', () => {
    const store = new QueueStore()
    const item = store.addItem('削除対象')
    const onRemove = vi.fn()

    render(<QueuePanel store={store} onRemove={onRemove} />)

    const deleteButton = screen.getByLabelText('削除')
    fireEvent.click(deleteButton)

    expect(onRemove).toHaveBeenCalledWith(item.id)
  })

  it('優先度を表示する', () => {
    const store = new QueueStore()
    store.addItem('高優先度', 3)
    store.addItem('通常優先度', 2)
    store.addItem('低優先度', 1)

    render(<QueuePanel store={store} />)

    const priorityElements = screen.getAllByText(/高|中|低/)
    const priorities = priorityElements.map((el) => el.textContent)
    expect(priorities).toContain('高')
    expect(priorities).toContain('中')
    expect(priorities).toContain('低')
  })

  it('ステータスを表示する', () => {
    const store = new QueueStore()
    store.addItem('待機中')
    const item2 = store.addItem('処理中')
    const item3 = store.addItem('完了')

    store.updateStatus(item2.id, 'processing')
    store.updateStatus(item3.id, 'completed')

    render(<QueuePanel store={store} />)

    const items = screen.getAllByRole('listitem')
    expect(items[0].className).toContain('queue-item-pending')
    expect(items[1].className).toContain('queue-item-processing')
    expect(items[2].className).toContain('queue-item-completed')
  })

  it('キューをクリアできる', () => {
    const store = new QueueStore()
    store.addItem('アイテム1')
    store.addItem('アイテム2')
    const onClear = vi.fn()

    render(<QueuePanel store={store} onClear={onClear} />)

    const clearButton = screen.getByText('すべてクリア')
    fireEvent.click(clearButton)

    expect(onClear).toHaveBeenCalled()
  })
})
