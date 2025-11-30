import { useState, useCallback, useEffect } from 'react';
import { TransportControls } from './TransportControls';
import { Visualizer } from './Visualizer';
import type { PlayerState, AudioData } from '../types';
import type { VisualizerType } from '../visuals/scene';
import './Player.css';

interface PlayerProps {
  state: PlayerState;
  audioData: AudioData | null;
  isDemoMode?: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onBalanceChange: (balance: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToggleEQ: () => void;
  onTogglePlaylist: () => void;
  onStartDemo: () => void;
  eqVisible: boolean;
  playlistVisible: boolean;
}

export function Player({
  state,
  audioData,
  isDemoMode = false,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onVolumeChange,
  onBalanceChange,
  onPrevious,
  onNext,
  onToggleEQ,
  onTogglePlaylist,
  onStartDemo,
  eqVisible,
  playlistVisible,
}: PlayerProps) {
  const [visualizerType, setVisualizerType] = useState<VisualizerType>('bars');
  const [isShaded, setIsShaded] = useState(false);
  const [marqueeOffset, setMarqueeOffset] = useState(0);

  // Marquee scrolling animation
  useEffect(() => {
    if (!state.currentTrack) return;

    const interval = setInterval(() => {
      setMarqueeOffset(prev => (prev + 1) % (state.currentTrack!.name.length * 8 + 100));
    }, 100);

    return () => clearInterval(interval);
  }, [state.currentTrack]);

  const formatTime = useCallback((seconds: number): string => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60) % 60;
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleSeekChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSeek(parseFloat(e.target.value));
    },
    [onSeek]
  );

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onVolumeChange(parseFloat(e.target.value));
    },
    [onVolumeChange]
  );

  const handleBalanceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onBalanceChange(parseFloat(e.target.value));
    },
    [onBalanceChange]
  );

  const toggleShade = useCallback(() => {
    setIsShaded(prev => !prev);
  }, []);

  return (
    <div className={`player-main winamp-window ${isShaded ? 'shaded' : ''}`}>
      <div className="winamp-titlebar" onDoubleClick={toggleShade}>
        <div className="titlebar-buttons-left">
          <button className="titlebar-btn menu-btn" aria-label="Menu">
            ≡
          </button>
        </div>
        <span className="titlebar-text">WINAMP</span>
        <div className="titlebar-buttons-right">
          <button className="titlebar-btn minimize-btn" aria-label="Minimize">
            _
          </button>
          <button className="titlebar-btn shade-btn" onClick={toggleShade} aria-label="Shade">
            ▄
          </button>
          <button className="titlebar-btn close-btn" aria-label="Close">
            ×
          </button>
        </div>
      </div>

      {!isShaded && (
        <div className="player-content">
          {/* Visualizer Display */}
          <div className="visualizer-display">
            <Visualizer
              audioData={audioData}
              type={visualizerType}
              onTypeChange={setVisualizerType}
            />
          </div>

          {/* Track Info & Time */}
          <div className="info-display">
            <div className="time-display">
              <span className="time-current">{formatTime(state.currentTime)}</span>
            </div>

            <div className="track-info">
              <div className="marquee-container">
                <span
                  className="marquee-text"
                  style={{ transform: `translateX(-${marqueeOffset}px)` }}
                >
                  {state.currentTrack
                    ? `${state.currentTrack.artist ? state.currentTrack.artist + ' - ' : ''}${state.currentTrack.name}`
                    : 'WINAMP - Press DEMO or add tracks'}
                </span>
              </div>
            </div>

            <div className="format-info">
              <span className="kbps">{isDemoMode ? 'GEN' : '192'}</span>
              <span className="khz">44</span>
              <span className="stereo">{state.isPlaying ? 'STEREO' : 'MONO'}</span>
            </div>
          </div>

          {/* Seek Bar */}
          <div className="seek-container">
            <input
              type="range"
              min="0"
              max={isDemoMode ? 100 : (state.duration || 100)}
              step="0.1"
              value={isDemoMode ? (state.currentTime % 100) : state.currentTime}
              onChange={handleSeekChange}
              className="seek-slider"
              disabled={!state.currentTrack || isDemoMode}
              aria-label="Seek"
            />
          </div>

          {/* Controls Row */}
          <div className="controls-row">
            <TransportControls
              isPlaying={state.isPlaying}
              onPlay={onPlay}
              onPause={onPause}
              onStop={onStop}
              onPrevious={onPrevious}
              onNext={onNext}
              disabled={!state.currentTrack && !isDemoMode}
            />

            <div className="volume-balance">
              <div className="volume-container">
                <label className="slider-label">VOL</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={state.volume}
                  onChange={handleVolumeChange}
                  className="volume-slider"
                  aria-label="Volume"
                />
              </div>
              <div className="balance-container">
                <label className="slider-label">BAL</label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={state.balance}
                  onChange={handleBalanceChange}
                  className="balance-slider"
                  aria-label="Balance"
                />
              </div>
            </div>
          </div>

          {/* Toggle Buttons */}
          <div className="toggle-buttons">
            <button
              className={`toggle-btn demo-btn ${isDemoMode ? 'active' : ''}`}
              onClick={onStartDemo}
              disabled={isDemoMode}
              title="Play demo audio"
            >
              DEMO
            </button>
            <button
              className={`toggle-btn ${eqVisible ? 'active' : ''}`}
              onClick={onToggleEQ}
            >
              EQ
            </button>
            <button
              className={`toggle-btn ${playlistVisible ? 'active' : ''}`}
              onClick={onTogglePlaylist}
            >
              PL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
