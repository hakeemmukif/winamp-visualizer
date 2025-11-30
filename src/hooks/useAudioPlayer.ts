import { useState, useRef, useCallback, useEffect } from 'react';
import type { Track, PlayerState, AudioData } from '../types';
import { audioProcessor } from '../audio/audioProcessor';

const initialState: PlayerState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.75,
  balance: 0,
  currentTrack: null,
  playlist: [],
};

export function useAudioPlayer() {
  const [state, setState] = useState<PlayerState>(initialState);
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number>(0);
  const isInitializedRef = useRef(false);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.crossOrigin = 'anonymous';
    }

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setState(prev => ({ ...prev, currentTime: audio.currentTime }));
    };

    const handleDurationChange = () => {
      setState(prev => ({ ...prev, duration: audio.duration || 0 }));
    };

    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
      // Auto-play next track if available
      playNext();
    };

    const handlePlay = () => {
      setState(prev => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  // Animation loop for audio data
  useEffect(() => {
    const updateAudioData = () => {
      if (audioProcessor.isReady && state.isPlaying) {
        const data = audioProcessor.getAudioData();
        setAudioData(data);
      }
      animationFrameRef.current = requestAnimationFrame(updateAudioData);
    };

    animationFrameRef.current = requestAnimationFrame(updateAudioData);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [state.isPlaying]);

  const initializeAudio = useCallback(async () => {
    if (!audioRef.current || isInitializedRef.current) return;
    await audioProcessor.initialize(audioRef.current);
    isInitializedRef.current = true;
  }, []);

  const loadTrack = useCallback(async (track: Track) => {
    if (!audioRef.current) return;

    await initializeAudio();

    audioRef.current.src = track.url;
    audioRef.current.load();

    setState(prev => ({
      ...prev,
      currentTrack: track,
      currentTime: 0,
      duration: 0,
    }));
  }, [initializeAudio]);

  const play = useCallback(async () => {
    if (!audioRef.current || !state.currentTrack) return;

    await audioProcessor.resume();
    await audioRef.current.play();
  }, [state.currentTrack]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
  }, []);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(time, state.duration));
  }, [state.duration]);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
    audioProcessor.setVolume(clampedVolume);
    setState(prev => ({ ...prev, volume: clampedVolume }));
  }, []);

  const setBalance = useCallback((balance: number) => {
    const clampedBalance = Math.max(-1, Math.min(1, balance));
    audioProcessor.setBalance(clampedBalance);
    setState(prev => ({ ...prev, balance: clampedBalance }));
  }, []);

  const addToPlaylist = useCallback((files: FileList) => {
    const newTracks: Track[] = Array.from(files)
      .filter(file => /\.(mp3|wav|ogg|flac|m4a)$/i.test(file.name))
      .map(file => ({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        duration: 0,
        file,
        url: URL.createObjectURL(file),
      }));

    setState(prev => ({
      ...prev,
      playlist: [...prev.playlist, ...newTracks],
    }));

    // Auto-load first track if nothing is loaded
    if (!state.currentTrack && newTracks.length > 0) {
      loadTrack(newTracks[0]);
    }
  }, [state.currentTrack, loadTrack]);

  const removeFromPlaylist = useCallback((trackId: string) => {
    setState(prev => ({
      ...prev,
      playlist: prev.playlist.filter(t => t.id !== trackId),
    }));
  }, []);

  const clearPlaylist = useCallback(() => {
    // Revoke object URLs
    state.playlist.forEach(track => URL.revokeObjectURL(track.url));
    setState(prev => ({
      ...prev,
      playlist: [],
      currentTrack: null,
      isPlaying: false,
    }));
    if (audioRef.current) {
      audioRef.current.src = '';
    }
  }, [state.playlist]);

  const playNext = useCallback(() => {
    const currentIndex = state.playlist.findIndex(t => t.id === state.currentTrack?.id);
    if (currentIndex < state.playlist.length - 1) {
      loadTrack(state.playlist[currentIndex + 1]);
    }
  }, [state.playlist, state.currentTrack, loadTrack]);

  const playPrevious = useCallback(() => {
    const currentIndex = state.playlist.findIndex(t => t.id === state.currentTrack?.id);
    if (currentIndex > 0) {
      loadTrack(state.playlist[currentIndex - 1]);
    }
  }, [state.playlist, state.currentTrack, loadTrack]);

  const selectTrack = useCallback((trackId: string) => {
    const track = state.playlist.find(t => t.id === trackId);
    if (track) {
      loadTrack(track);
    }
  }, [state.playlist, loadTrack]);

  return {
    state,
    audioData,
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
    loadTrack,
  };
}
