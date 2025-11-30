import { useState, useCallback, useEffect } from 'react';
import { Player } from './components/Player';
import { Equalizer } from './components/Equalizer';
import { Playlist } from './components/Playlist';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import './styles/winamp.css';
import './App.css';

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
    setBalance,
    addToPlaylist,
    removeFromPlaylist,
    clearPlaylist,
    playNext,
    playPrevious,
    selectTrack,
    startDemo,
  } = useAudioPlayer();

  const [eqVisible, setEqVisible] = useState(true);
  const [playlistVisible, setPlaylistVisible] = useState(true);

  const toggleEQ = useCallback(() => {
    setEqVisible(prev => !prev);
  }, []);

  const togglePlaylist = useCallback(() => {
    setPlaylistVisible(prev => !prev);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (state.isPlaying) {
            pause();
          } else {
            play();
          }
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
        case 'KeyE':
          toggleEQ();
          break;
        case 'KeyP':
          togglePlaylist();
          break;
        case 'KeyD':
          if (!isDemoMode) {
            startDemo();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isPlaying, state.currentTime, state.duration, state.volume, play, pause, seek, setVolume, toggleEQ, togglePlaylist, isDemoMode, startDemo]);

  // Auto-play when track is loaded (but not for demo mode)
  useEffect(() => {
    if (state.currentTrack && !state.isPlaying && state.currentTrack.id !== 'demo') {
      play();
    }
  }, [state.currentTrack?.id]);

  return (
    <div className="app-container">
      <div className="winamp-container">
        <Player
          state={state}
          audioData={audioData}
          isDemoMode={isDemoMode}
          onPlay={play}
          onPause={pause}
          onStop={stop}
          onSeek={seek}
          onVolumeChange={setVolume}
          onBalanceChange={setBalance}
          onPrevious={playPrevious}
          onNext={playNext}
          onToggleEQ={toggleEQ}
          onTogglePlaylist={togglePlaylist}
          onStartDemo={startDemo}
          eqVisible={eqVisible}
          playlistVisible={playlistVisible}
        />

        <Equalizer visible={eqVisible} onClose={() => setEqVisible(false)} />

        <Playlist
          tracks={state.playlist}
          currentTrack={state.currentTrack}
          onSelectTrack={(id) => {
            selectTrack(id);
            play();
          }}
          onAddFiles={addToPlaylist}
          onRemoveTrack={removeFromPlaylist}
          onClearPlaylist={clearPlaylist}
          visible={playlistVisible}
          onClose={() => setPlaylistVisible(false)}
        />
      </div>

      <div className="keyboard-hints">
        <span>Space: Play/Pause</span>
        <span>Arrows: Seek/Volume</span>
        <span>D: Demo Mode</span>
        <span>E: EQ</span>
        <span>P: Playlist</span>
      </div>
    </div>
  );
}

export default App;
