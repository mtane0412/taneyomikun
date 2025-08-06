/**
 * メインアプリケーションコンポーネント
 * 音声読み上げアプリケーションのメインUI
 **/
import { useState } from 'react'

function App() {
  const [text, setText] = useState('')

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
        <button className="btn btn-primary">読み上げ開始</button>
        <button className="btn btn-secondary">停止</button>
      </div>
    </div>
  )
}

export default App
