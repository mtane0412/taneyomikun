/**
 * 音声再生マネージャー
 * 別スレッドで音声再生を管理し、チャンネル経由で制御する
 */

use anyhow::Result;
use crossbeam_channel::{bounded, Receiver, Sender};
use std::thread;
use std::sync::{Arc, Mutex};
use std::collections::VecDeque;
use cpal::StreamConfig;

#[derive(Debug, Clone)]
pub enum AudioCommand {
    Play(Vec<f32>),
    Stop,
    SetVolume(f32),
}

pub struct AudioManager {
    command_sender: Sender<AudioCommand>,
}

impl AudioManager {
    pub fn new() -> Result<Self> {
        let (command_sender, command_receiver) = bounded::<AudioCommand>(100);
        
        // 音声再生スレッドを起動
        thread::spawn(move || {
            if let Err(e) = Self::audio_thread(command_receiver) {
                log::error!("[AudioManager] Audio thread error: {}", e);
            }
        });
        
        Ok(Self { command_sender })
    }
    
    fn audio_thread(command_receiver: Receiver<AudioCommand>) -> Result<()> {
        use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
        
        let host = cpal::default_host();
        let device = host
            .default_output_device()
            .ok_or_else(|| anyhow::anyhow!("No output device found"))?;
        
        let config = device.default_output_config()?;
        let sample_rate = config.sample_rate().0;
        let channels = config.channels();
        
        log::info!("[AudioManager] Output config: {} Hz, {} channels", sample_rate, channels);
        log::info!("[AudioManager] Input format: 44100 Hz, 1 channel (mono), f32le");
        log::info!("[AudioManager] Resample ratio: {:.3}", sample_rate as f32 / 44100.0);
        
        let buffer = Arc::new(Mutex::new(VecDeque::<f32>::new()));
        let volume = Arc::new(Mutex::new(1.0f32));
        let is_playing = Arc::new(Mutex::new(true));
        
        // コマンド受信スレッド
        let buffer_clone = buffer.clone();
        let volume_clone = volume.clone();
        let is_playing_clone = is_playing.clone();
        
        thread::spawn(move || {
            while let Ok(command) = command_receiver.recv() {
                match command {
                    AudioCommand::Play(audio_data) => {
                        if let Ok(mut buf) = buffer_clone.lock() {
                            buf.extend(audio_data);
                        }
                        if let Ok(mut playing) = is_playing_clone.lock() {
                            *playing = true;
                        }
                    }
                    AudioCommand::Stop => {
                        if let Ok(mut buf) = buffer_clone.lock() {
                            buf.clear();
                        }
                        if let Ok(mut playing) = is_playing_clone.lock() {
                            *playing = false;
                        }
                    }
                    AudioCommand::SetVolume(vol) => {
                        if let Ok(mut v) = volume_clone.lock() {
                            *v = vol.clamp(0.0, 1.0);
                        }
                    }
                }
            }
        });
        
        // 音声ストリームを作成
        let stream = match config.sample_format() {
            cpal::SampleFormat::F32 => Self::build_stream::<f32>(
                &device,
                &config.into(),
                buffer,
                volume,
                is_playing,
                sample_rate,
                channels,
            )?,
            cpal::SampleFormat::I16 => Self::build_stream::<i16>(
                &device,
                &config.into(),
                buffer,
                volume,
                is_playing,
                sample_rate,
                channels,
            )?,
            cpal::SampleFormat::U16 => Self::build_stream::<u16>(
                &device,
                &config.into(),
                buffer,
                volume,
                is_playing,
                sample_rate,
                channels,
            )?,
            sample_format => {
                return Err(anyhow::anyhow!("Unsupported sample format: {:?}", sample_format));
            }
        };
        
        stream.play()?;
        
        // ストリームを維持するため無限ループ
        loop {
            thread::sleep(std::time::Duration::from_secs(1));
        }
    }
    
    fn build_stream<T>(
        device: &cpal::Device,
        config: &StreamConfig,
        buffer: Arc<Mutex<VecDeque<f32>>>,
        volume: Arc<Mutex<f32>>,
        is_playing: Arc<Mutex<bool>>,
        output_sample_rate: u32,
        output_channels: u16,
    ) -> Result<cpal::Stream>
    where
        T: cpal::Sample + cpal::SizedSample + cpal::FromSample<f32>,
    {
        use cpal::traits::DeviceTrait;
        
        let input_sample_rate = 44100; // Cartesia APIの出力
        // 注意: これは入力サンプルの進み方を表す（出力1サンプルに対して入力を何サンプル進めるか）
        let resample_ratio = input_sample_rate as f32 / output_sample_rate as f32;
        let mut resample_position = 0.0;
        
        log::info!("[AudioManager] Building stream - Input: {} Hz, Output: {} Hz, Input step per output sample: {:.3}", 
                   input_sample_rate, output_sample_rate, resample_ratio);
        
        let err_fn = |err: cpal::StreamError| log::error!("[AudioManager] Stream error: {}", err);
        
        let stream = device.build_output_stream(
            config,
            move |data: &mut [T], _: &cpal::OutputCallbackInfo| {
                let is_playing = is_playing.lock().map(|p| *p).unwrap_or(false);
                if !is_playing {
                    for sample in data.iter_mut() {
                        *sample = T::EQUILIBRIUM;
                    }
                    return;
                }
                
                let volume = volume.lock().map(|v| *v).unwrap_or(1.0);
                let mut buffer = match buffer.lock() {
                    Ok(b) => b,
                    Err(_) => return,
                };
                
                for frame in data.chunks_mut(output_channels as usize) {
                    // リサンプリング位置の整数部分と小数部分
                    let sample_index = resample_position as usize;
                    let fraction = resample_position - sample_index as f32;
                    
                    // 線形補間によるリサンプリング
                    let interpolated_sample = if sample_index < buffer.len() {
                        let sample1 = buffer.get(sample_index).copied().unwrap_or(0.0);
                        let sample2 = buffer.get(sample_index + 1).copied().unwrap_or(sample1);
                        // 線形補間: sample1 * (1 - fraction) + sample2 * fraction
                        sample1 * (1.0 - fraction) + sample2 * fraction
                    } else {
                        0.0
                    };
                    
                    // ボリューム適用
                    let sample_with_volume = interpolated_sample * volume;
                    
                    // 全チャンネルに同じサンプルを出力（モノラル→ステレオ/マルチチャンネル）
                    for channel_sample in frame.iter_mut() {
                        *channel_sample = T::from_sample(sample_with_volume);
                    }
                    
                    // リサンプリング位置を進める
                    resample_position += resample_ratio;
                    
                    // 処理済みのサンプルをバッファから削除
                    let samples_to_remove = resample_position as usize;
                    if samples_to_remove > 0 {
                        let buffer_len = buffer.len();
                        buffer.drain(..samples_to_remove.min(buffer_len));
                        resample_position -= samples_to_remove as f32;
                    }
                }
            },
            err_fn,
            None,
        )?;
        
        Ok(stream)
    }
    
    pub fn play_audio(&self, audio_data: Vec<f32>) -> Result<()> {
        self.command_sender.send(AudioCommand::Play(audio_data))
            .map_err(|e| anyhow::anyhow!("Failed to send play command: {}", e))
    }
    
    pub fn stop(&self) -> Result<()> {
        self.command_sender.send(AudioCommand::Stop)
            .map_err(|e| anyhow::anyhow!("Failed to send stop command: {}", e))
    }
    
    pub fn set_volume(&self, volume: f32) -> Result<()> {
        self.command_sender.send(AudioCommand::SetVolume(volume))
            .map_err(|e| anyhow::anyhow!("Failed to send volume command: {}", e))
    }
}