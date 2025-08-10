/**
 * 速度コントロールコンポーネント
 * アイコンクリックでスライダーを表示
 */
import { useState, useRef, useEffect } from 'react'
import { Gauge } from 'lucide-react'

interface SpeedControlProps {
  speed: number
  onChange: (speed: number) => void
}

export function SpeedControl({ speed, onChange }: SpeedControlProps) {
  const [showSlider, setShowSlider] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setShowSlider(false)
      }
    }

    if (showSlider) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showSlider])

  const getSpeedLabel = () => {
    if (speed === -1) return '最遅'
    if (speed === -0.5) return '遅い'
    if (speed === 0) return '標準'
    if (speed === 0.5) return '速い'
    return '最速'
  }

  return (
    <div className="speed-control" ref={popoverRef}>
      <button
        className="btn btn-secondary icon-btn"
        onClick={() => setShowSlider(!showSlider)}
        title={`速度: ${getSpeedLabel()}`}
      >
        <Gauge size={20} />
      </button>
      {showSlider && (
        <div className="popover">
          <div className="popover-content">
            <label htmlFor="speed-slider" className="popover-label">
              音声速度: {speed > 0 ? `+${speed.toFixed(1)}` : speed.toFixed(1)}
              <span className="speed-label">({getSpeedLabel()})</span>
            </label>
            <input
              id="speed-slider"
              type="range"
              min="-1"
              max="1"
              step="0.1"
              value={speed}
              onChange={(e) => onChange(Number(e.target.value))}
              className="voice-speed-slider"
              style={{ width: '200px' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
