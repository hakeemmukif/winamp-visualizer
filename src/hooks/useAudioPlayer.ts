import { useState, useRef, useCallback, useEffect } from 'react';
import type { Track, PlayerState, AudioData } from '../types';
import { audioContextManager } from '../audio/audioContext';

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
  const [isDemoMode, setIsDemoMode] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const demoIntervalRef = useRef<number | null>(null);
  const demoTimeRef = useRef(0);
  const demoNodesRef = useRef<AudioScheduledSourceNode[]>([]);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.crossOrigin = 'anonymous';
    }

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      if (!isDemoMode) {
        setState(prev => ({ ...prev, currentTime: audio.currentTime }));
      }
    };

    const handleDurationChange = () => {
      setState(prev => ({ ...prev, duration: audio.duration || 0 }));
    };

    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
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
  }, [isDemoMode]);

  // Animation loop for audio data
  useEffect(() => {
    const updateAudioData = () => {
      if (audioContextManager.isReady && state.isPlaying) {
        const data = audioContextManager.getAudioData();
        setAudioData(data);

        // Update demo time
        if (isDemoMode) {
          demoTimeRef.current += 1 / 60;
          setState(prev => ({ ...prev, currentTime: demoTimeRef.current }));
        }
      }
      animationFrameRef.current = requestAnimationFrame(updateAudioData);
    };

    animationFrameRef.current = requestAnimationFrame(updateAudioData);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [state.isPlaying, isDemoMode]);

  const initializeAudioContext = useCallback(async () => {
    await audioContextManager.initialize();
  }, []);

  const connectAudioElement = useCallback(async () => {
    if (!audioRef.current || !audioContextManager.context) return;

    // Create media source if not exists
    if (!mediaSourceRef.current) {
      mediaSourceRef.current = audioContextManager.context.createMediaElementSource(audioRef.current);
    }

    audioContextManager.connectSource(mediaSourceRef.current);
  }, []);

  const startDemo = useCallback(async () => {
    await initializeAudioContext();

    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    // Disconnect previous source
    audioContextManager.disconnectSource();

    // Start demo beat
    const ctx = audioContextManager.context;
    if (!ctx) return;

    const bpm = 120;
    const beatInterval = 60 / bpm;
    let beatCount = 0;

    const scheduleBeat = () => {
      if (!audioContextManager.context || audioContextManager.context.state === 'closed') return;

      const now = ctx.currentTime;
      const beat = beatCount % 8;

      // Kick on 0, 2, 4, 6
      if (beat % 2 === 0) {
        playKick(ctx, now);
      }

      // Snare on 2, 6
      if (beat === 2 || beat === 6) {
        playSnare(ctx, now);
      }

      // Hi-hat every beat
      playHiHat(ctx, now);

      // Bass
      if (beat % 2 === 0) {
        const notes = [55, 55, 73.42, 65.41];
        playBass(ctx, now, notes[Math.floor(beat / 2)]);
      }

      // Arpeggio
      playArp(ctx, now, beat);

      beatCount++;
    };

    // Start immediately
    scheduleBeat();

    // Schedule beats
    demoIntervalRef.current = window.setInterval(scheduleBeat, beatInterval * 1000);

    demoTimeRef.current = 0;
    setIsDemoMode(true);
    setState(prev => ({
      ...prev,
      isPlaying: true,
      currentTrack: {
        id: 'demo',
        name: 'Synthwave Demo',
        artist: 'Generated',
        duration: Infinity,
        file: null as unknown as File,
        url: '',
      },
      duration: 999,
    }));
  }, [initializeAudioContext]);

  const stopDemo = useCallback(() => {
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }

    // Stop all scheduled nodes
    demoNodesRef.current.forEach(node => {
      try { node.stop(); } catch { /* already stopped */ }
    });
    demoNodesRef.current = [];

    setIsDemoMode(false);
    setState(prev => ({
      ...prev,
      isPlaying: false,
      currentTrack: null,
      currentTime: 0,
    }));
    setAudioData(null);
  }, []);

  const loadTrack = useCallback(async (track: Track) => {
    if (isDemoMode) {
      stopDemo();
    }

    if (!audioRef.current) return;

    await initializeAudioContext();
    await connectAudioElement();

    audioRef.current.src = track.url;
    audioRef.current.load();

    setState(prev => ({
      ...prev,
      currentTrack: track,
      currentTime: 0,
      duration: 0,
    }));
  }, [isDemoMode, stopDemo, initializeAudioContext, connectAudioElement]);

  const play = useCallback(async () => {
    if (isDemoMode) {
      await audioContextManager.resume();
      setState(prev => ({ ...prev, isPlaying: true }));
      return;
    }

    if (!audioRef.current || !state.currentTrack) return;

    await audioContextManager.resume();
    await audioRef.current.play();
  }, [state.currentTrack, isDemoMode]);

  const pause = useCallback(async () => {
    if (isDemoMode) {
      await audioContextManager.suspend();
      setState(prev => ({ ...prev, isPlaying: false }));
      return;
    }
    audioRef.current?.pause();
  }, [isDemoMode]);

  const stop = useCallback(() => {
    if (isDemoMode) {
      stopDemo();
      return;
    }

    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
  }, [isDemoMode, stopDemo]);

  const seek = useCallback((time: number) => {
    if (isDemoMode) return;
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(time, state.duration));
  }, [state.duration, isDemoMode]);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
    audioContextManager.setVolume(clampedVolume);
    setState(prev => ({ ...prev, volume: clampedVolume }));
  }, []);

  const setBalance = useCallback((balance: number) => {
    const clampedBalance = Math.max(-1, Math.min(1, balance));
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

  // Demo sound generators - connect to EQ input
  function playKick(ctx: AudioContext, time: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.1);
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
    osc.connect(gain);
    if (audioContextManager.inputNode) {
      gain.connect(audioContextManager.inputNode);
    }
    osc.start(time);
    osc.stop(time + 0.3);
    demoNodesRef.current.push(osc);
  }

  function playSnare(ctx: AudioContext, time: number): void {
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);
    noise.connect(filter).connect(gain);
    if (audioContextManager.inputNode) {
      gain.connect(audioContextManager.inputNode);
    }
    noise.start(time);
    noise.stop(time + 0.15);
    demoNodesRef.current.push(noise);
  }

  function playHiHat(ctx: AudioContext, time: number): void {
    const bufferSize = ctx.sampleRate * 0.03;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.03);
    noise.connect(filter).connect(gain);
    if (audioContextManager.inputNode) {
      gain.connect(audioContextManager.inputNode);
    }
    noise.start(time);
    noise.stop(time + 0.03);
    demoNodesRef.current.push(noise);
  }

  function playBass(ctx: AudioContext, time: number, freq: number): void {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, time);
    filter.frequency.exponentialRampToValueAtTime(150, time + 0.3);
    gain.gain.setValueAtTime(0.35, time);
    gain.gain.setValueAtTime(0.35, time + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.45);
    osc.connect(filter).connect(gain);
    if (audioContextManager.inputNode) {
      gain.connect(audioContextManager.inputNode);
    }
    osc.start(time);
    osc.stop(time + 0.45);
    demoNodesRef.current.push(osc);
  }

  function playArp(ctx: AudioContext, time: number, beat: number): void {
    const notes = [220, 261.63, 329.63, 392, 440, 523.25, 440, 392];
    const freq = notes[beat % notes.length];

    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc2.type = 'square';
    osc2.frequency.value = freq * 1.005;

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, time);
    filter.frequency.exponentialRampToValueAtTime(400, time + 0.2);
    filter.Q.value = 4;

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.22);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    if (audioContextManager.inputNode) {
      gain.connect(audioContextManager.inputNode);
    }

    osc.start(time);
    osc.stop(time + 0.22);
    osc2.start(time);
    osc2.stop(time + 0.22);

    demoNodesRef.current.push(osc, osc2);
  }

  return {
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
    loadTrack,
    startDemo,
    stopDemo,
  };
}
