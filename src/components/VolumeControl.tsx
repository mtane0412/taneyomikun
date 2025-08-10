/**
 * 音量コントロールコンポーネント
 * アイコンクリックでスライダーを表示
 */
import { useState, useRef, useEffect } from 'react'
import { Volume2 } from 'lucide-react'

interface VolumeControlProps {
  volume: number
  onChange: (volume: number) => void
}

export function VolumeControl({ volume, onChange }: VolumeControlProps) {
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

  return (
    <div className="volume-control" ref={popoverRef}>
      <button
        className="btn btn-secondary icon-btn"
        onClick={() => setShowSlider(!showSlider)}
        title={`音量: ${volume}%`}
      >
        <Volume2 size={20} />
      </button>
      {showSlider && (
        <div className="popover">
          <div className="popover-content">
            <label htmlFor="volume-slider" className="popover-label">
              音量: {volume}%
            </label>
            <input
              id="volume-slider"
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => onChange(Number(e.target.value))}
              className="volume-slider"
              style={{ width: '200px' }}
            />
            <div className="volume-indicator" style={{ width: '200px' }}>
              <div className="volume-bar" style={{ width: `${volume}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
