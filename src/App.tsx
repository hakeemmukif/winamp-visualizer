import { useState, useCallback, useEffect, useRef } from 'react';
import { Visualizer } from './components/Visualizer';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { audioContextManager } from './audio/audioContext';
import type { VisualizerType } from './visuals/scene';
import './App.css';

const EQ_BANDS = [
  { frequency: 60, label: '60' },
  { frequency: 170, label: '170' },
  { frequency: 310, label: '310' },
  { frequency: 600, label: '600' },
  { frequency: 1000, label: '1K' },
  { frequency: 3000, label: '3K' },
  { frequency: 6000, label: '6K' },
  { frequency: 12000, label: '12K' },
  { frequency: 14000, label: '14K' },
  { frequency: 16000, label: '16K' },
];

const EQ_PRESETS: Record<string, number[]> = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  rock: [5, 4, 3, 1, -1, -1, 0, 2, 3, 4],
  pop: [-1, 2, 4, 5, 4, 1, -1, -1, 2, 3],
  jazz: [3, 2, 1, 2, -2, -2, 0, 2, 3, 4],
  electronic: [5, 4, 1, -1, -2, 2, 4, 4, 3, 3],
  bass: [6, 5, 4, 2, 0, -2, -3, -3, -2, -2],
};

function App() {
  const {
    state,
    audioData,
    isDemoMode,
    play,
    pause,
    stop,
    seek,
    setVolume,
    addToPlaylist,
    removeFromPlaylist,
    clearPlaylist,
    playNext,
    playPrevious,
    selectTrack,
    startDemo,
    stopDemo,
  } = useAudioPlayer();

  const [visualizerType, setVisualizerType] = useState<VisualizerType>('ambience');
  const [showControls, setShowControls] = useState(true);
  const [showEQ, setShowEQ] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [eqEnabled, setEqEnabled] = useState(true);
  const [eqBands, setEqBands] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [eqPreset, setEqPreset] = useState('flat');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hideTimeoutRef = useRef<number | null>(null);

  // Auto-hide controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      hideTimeoutRef.current = window.setTimeout(() => {
        if (!showEQ && !showPlaylist) {
          setShowControls(false);
        }
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [showEQ, showPlaylist]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (state.isPlaying) pause();
          else play();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seek(Math.max(0, state.currentTime - 5));
          break;
        case 'ArrowRight':
          e.preventDefault();
          seek(Math.min(state.duration, state.currentTime + 5));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, state.volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, state.volume - 0.1));
          break;
        case 'KeyV':
          cycleVisualizerType();
          break;
        case 'KeyE':
          setShowEQ(prev => !prev);
          break;
        case 'KeyP':
          setShowPlaylist(prev => !prev);
          break;
        case 'KeyD':
          if (!isDemoMode) startDemo();
          break;
        case 'Escape':
          setShowEQ(false);
          setShowPlaylist(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isPlaying, state.currentTime, state.duration, state.volume, play, pause, seek, setVolume, isDemoMode, startDemo]);

  const cycleVisualizerType = useCallback(() => {
    const types: VisualizerType[] = ['ambience', 'battery', 'bars', 'waveform', 'particles', 'tunnel'];
    const currentIndex = types.indexOf(visualizerType);
    const nextIndex = (currentIndex + 1) % types.length;
    setVisualizerType(types[nextIndex]);
  }, [visualizerType]);

  const formatTime = useCallback((seconds: number): string => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleEqBandChange = useCallback((index: number, value: number) => {
    setEqBands(prev => {
      const newBands = [...prev];
      newBands[index] = value;
      return newBands;
    });
    audioContextManager.setEQBand(index, value);
    setEqPreset('custom');
  }, []);

  const handleEqPresetChange = useCallback((preset: string) => {
    const presetValues = EQ_PRESETS[preset];
    if (presetValues) {
      setEqBands(presetValues);
      setEqPreset(preset);
      presetValues.forEach((gain, index) => {
        audioContextManager.setEQBand(index, gain);
      });
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addToPlaylist(e.target.files);
    }
  }, [addToPlaylist]);

  const handlePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else if (state.currentTrack || isDemoMode) {
      play();
    } else {
      startDemo();
    }
  }, [state.isPlaying, state.currentTrack, isDemoMode, play, pause, startDemo]);

  const handleStop = useCallback(() => {
    if (isDemoMode) {
      stopDemo();
    } else {
      stop();
    }
  }, [isDemoMode, stop, stopDemo]);

  return (
    <div className="app-container">
      {/* Fullscreen Visualizer */}
      <div className="fullscreen-visualizer">
        <Visualizer
          audioData={audioData}
          type={visualizerType}
          onTypeChange={setVisualizerType}
        />
      </div>

      {/* Visualizer Mode Button */}
      <button className="viz-mode-btn" onClick={cycleVisualizerType}>
        {visualizerType}
      </button>

      {/* Controls Overlay */}
      <div className={`controls-overlay ${showControls ? '' : 'hidden'}`}>
        {/* Track Info */}
        <div className="track-info-bar">
          <div className="track-details">
            <div className="track-title">
              {state.currentTrack?.name || (isDemoMode ? 'Synthwave Demo' : 'No track selected')}
            </div>
            <div className="track-artist">
              {state.currentTrack?.artist || (isDemoMode ? 'Generated Audio' : 'Click DEMO to start or add files')}
            </div>
          </div>
          <div className="time-display">
            {formatTime(state.currentTime)} / {formatTime(isDemoMode ? 999 : state.duration)}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-container">
          <input
            type="range"
            className="progress-bar"
            min="0"
            max={isDemoMode ? 100 : (state.duration || 100)}
            step="0.1"
            value={isDemoMode ? (state.currentTime % 100) : state.currentTime}
            onChange={(e) => seek(parseFloat(e.target.value))}
            disabled={isDemoMode}
          />
        </div>

        {/* Transport Row */}
        <div className="transport-row">
          <div className="transport-controls">
            <button className="transport-btn" onClick={playPrevious} title="Previous">
              &#9198;
            </button>
            <button className="transport-btn play-pause" onClick={handlePlayPause} title="Play/Pause">
              {state.isPlaying ? '\u23F8' : '\u25B6'}
            </button>
            <button className="transport-btn" onClick={handleStop} title="Stop">
              &#9209;
            </button>
            <button className="transport-btn" onClick={playNext} title="Next">
              &#9197;
            </button>

            <div className="volume-control">
              <span className="volume-icon">{state.volume > 0 ? '\u{1F509}' : '\u{1F507}'}</span>
              <input
                type="range"
                className="volume-slider"
                min="0"
                max="1"
                step="0.01"
                value={state.volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="right-controls">
            <button
              className={`control-btn demo ${isDemoMode ? 'active' : ''}`}
              onClick={() => isDemoMode ? stopDemo() : startDemo()}
            >
              {isDemoMode ? 'Stop Demo' : 'Demo'}
            </button>
            <button
              className={`control-btn ${showEQ ? 'active' : ''}`}
              onClick={() => setShowEQ(prev => !prev)}
            >
              EQ
            </button>
            <button
              className={`control-btn ${showPlaylist ? 'active' : ''}`}
              onClick={() => setShowPlaylist(prev => !prev)}
            >
              Playlist
            </button>
          </div>
        </div>
      </div>

      {/* EQ Panel */}
      <div className={`eq-panel ${showEQ ? 'visible' : ''}`}>
        <div className="eq-header">
          <span className="eq-title">Equalizer</span>
          <div className="eq-controls">
            <button
              className={`eq-toggle ${eqEnabled ? 'active' : ''}`}
              onClick={() => setEqEnabled(prev => !prev)}
            >
              {eqEnabled ? 'ON' : 'OFF'}
            </button>
            <select
              className="eq-preset"
              value={eqPreset}
              onChange={(e) => handleEqPresetChange(e.target.value)}
            >
              <option value="flat">Flat</option>
              <option value="rock">Rock</option>
              <option value="pop">Pop</option>
              <option value="jazz">Jazz</option>
              <option value="electronic">Electronic</option>
              <option value="bass">Bass Boost</option>
              {eqPreset === 'custom' && <option value="custom">Custom</option>}
            </select>
            <button className="eq-close" onClick={() => setShowEQ(false)}>×</button>
          </div>
        </div>
        <div className="eq-bands">
          {EQ_BANDS.map((band, index) => (
            <div key={band.frequency} className="eq-band">
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={eqEnabled ? eqBands[index] : 0}
                onChange={(e) => handleEqBandChange(index, parseFloat(e.target.value))}
                disabled={!eqEnabled}
              />
              <span className="eq-band-label">{band.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Playlist Panel */}
      <div className={`playlist-panel ${showPlaylist ? 'visible' : ''}`}>
        <div className="playlist-header">
          <span className="playlist-title">Playlist</span>
          <div className="playlist-actions">
            <button
              className="playlist-action-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              Add Files
            </button>
            <button
              className="playlist-action-btn"
              onClick={clearPlaylist}
            >
              Clear
            </button>
          </div>
        </div>
        <div className="playlist-content">
          {state.playlist.length === 0 ? (
            <div
              className="drop-zone"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="drop-zone-text">
                Drop audio files here<br />or click to browse
              </div>
            </div>
          ) : (
            state.playlist.map((track) => (
              <div
                key={track.id}
                className={`playlist-item ${state.currentTrack?.id === track.id ? 'active' : ''}`}
                onClick={() => {
                  selectTrack(track.id);
                  play();
                }}
              >
                <span className="playlist-item-name">{track.name}</span>
                <span className="playlist-item-duration">
                  {formatTime(track.duration)}
                </span>
                <button
                  className="playlist-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromPlaylist(track.id);
                  }}
                  style={{ marginLeft: '8px', padding: '4px 8px' }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="file-input-hidden"
        accept="audio/*"
        multiple
        onChange={handleFileSelect}
      />
    </div>
  );
}

export default App;
