/**
 * Web Audio APIを使用した音声プレイヤー
 * PCM f32le形式の音声データをストリーミング再生する
 */

/* eslint-env browser */

// デバッグログの有効化
const DEBUG = true
const log = (...args: unknown[]) =>
  DEBUG && console.log('[AudioPlayer]', ...args)
const error = (...args: unknown[]) => console.error('[AudioPlayer]', ...args)

export class AudioPlayer {
  private audioContext: AudioContext
  private gainNode: GainNode
  private audioQueue: AudioBuffer[] = []
  private isPlaying = false
  private currentSource: AudioBufferSourceNode | null = null
  private nextStartTime = 0
  private startTime = 0
  private totalChunksReceived = 0
  private totalBytesReceived = 0
  private totalBuffersPlayed = 0

  constructor() {
    log('Initializing AudioPlayer')
    this.audioContext = new AudioContext()
    log(
      'AudioContext created, sample rate:',
      this.audioContext.sampleRate,
      'state:',
      this.audioContext.state,
    )
    this.gainNode = this.audioContext.createGain()
    this.gainNode.connect(this.audioContext.destination)
    log('Audio pipeline connected')
  }

  /**
   * Base64エンコードされたPCM f32le音声データを追加
   */
  async appendAudioChunk(base64Audio: string): Promise<void> {
    this.totalChunksReceived++
    log(
      `Received chunk #${this.totalChunksReceived}, base64 length: ${base64Audio.length}`,
    )

    try {
      // Base64をデコード
      const binaryString = atob(base64Audio)
      const len = binaryString.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      this.totalBytesReceived += bytes.length
      log(
        `Decoded chunk #${this.totalChunksReceived}, size: ${bytes.length} bytes, total: ${this.totalBytesReceived} bytes`,
      )

      // PCM f32leをFloat32Arrayに変換
      const floatData = new Float32Array(bytes.buffer)
      log(`Float array created, length: ${floatData.length} samples`)

      // AudioBufferを作成（モノラル、44100Hz）
      const audioBuffer = this.audioContext.createBuffer(
        1,
        floatData.length,
        44100,
      )
      audioBuffer.copyToChannel(floatData, 0)
      log(`AudioBuffer created, duration: ${audioBuffer.duration.toFixed(3)}s`)

      this.audioQueue.push(audioBuffer)
      log(`Added to queue, queue size: ${this.audioQueue.length}`)

      // 自動再生開始
      if (!this.isPlaying) {
        log('Starting automatic playback')
        this.play()
      }
    } catch (err) {
      error('Failed to process audio chunk:', err)
      throw err
    }
  }

  /**
   * 再生を開始
   */
  play(): void {
    log(
      'play() called, isPlaying:',
      this.isPlaying,
      'queue length:',
      this.audioQueue.length,
    )

    if (!this.isPlaying && this.audioQueue.length > 0) {
      // 新規再生開始
      log('Starting new playback')
      this.isPlaying = true
      this.nextStartTime = this.audioContext.currentTime
      this.startTime = this.nextStartTime
      this.scheduleNextBuffer()
    } else {
      log('Cannot play: already playing or queue empty')
    }
  }

  /**
   * 停止
   */
  stop(): void {
    log('Stopping playback')
    if (this.currentSource) {
      this.currentSource.stop()
      this.currentSource = null
    }
    this.audioQueue = []
    this.isPlaying = false
    this.nextStartTime = 0
    this.startTime = 0
    log('Playback stopped')
  }

  /**
   * 音量設定（0.0 ~ 1.0）
   */
  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    this.gainNode.gain.value = clampedVolume
    log(`Volume set to: ${clampedVolume}`)
  }

  /**
   * 次のバッファをスケジューリング
   */
  private scheduleNextBuffer(): void {
    if (!this.isPlaying || this.audioQueue.length === 0) {
      // キューが空になったら再生終了
      if (this.audioQueue.length === 0) {
        log('Queue empty, playback complete')
        log(
          `Total stats - Chunks: ${this.totalChunksReceived}, Bytes: ${this.totalBytesReceived}, Buffers played: ${this.totalBuffersPlayed}`,
        )
        this.isPlaying = false
      }
      return
    }

    log(`Scheduling next buffer, queue size: ${this.audioQueue.length}`)

    const buffer = this.audioQueue.shift()!
    this.totalBuffersPlayed++
    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.connect(this.gainNode)
    log(
      `Playing buffer #${this.totalBuffersPlayed}, duration: ${buffer.duration.toFixed(3)}s`,
    )

    // 次のバッファの再生が終わったら、さらに次をスケジュール
    source.onended = () => {
      log(`Buffer #${this.totalBuffersPlayed} playback ended`)
      this.currentSource = null
      this.scheduleNextBuffer()
    }

    source.start(this.nextStartTime)
    this.currentSource = source
    log(`Started playback at time: ${this.nextStartTime.toFixed(3)}s`)

    // 次の開始時間を更新
    this.nextStartTime += buffer.duration
    log(`Next start time: ${this.nextStartTime.toFixed(3)}s`)
  }

  /**
   * 再生完了通知
   */
  onComplete(callback: () => void): void {
    log('Setting completion callback')
    // 再生終了時のコールバックを設定
    const checkCompletion = setInterval(() => {
      if (!this.isPlaying && this.audioQueue.length === 0) {
        log('Playback complete, calling callback')
        clearInterval(checkCompletion)
        callback()
      }
    }, 100)
  }

  /**
   * クリーンアップ
   */
  async close(): Promise<void> {
    log('Closing AudioPlayer')
    this.stop()
    await this.audioContext.close()
    log('AudioContext closed')
  }
}
