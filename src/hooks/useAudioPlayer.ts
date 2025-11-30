import { useState, useRef, useCallback, useEffect } from 'react';
import type { Track, PlayerState, AudioData } from '../types';
import { audioProcessor } from '../audio/audioProcessor';
import { DemoAudioGenerator } from '../audio/demoAudio';

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
  const animationFrameRef = useRef<number>(0);
  const isInitializedRef = useRef(false);
  const demoGeneratorRef = useRef<DemoAudioGenerator | null>(null);
  const demoAnalyserRef = useRef<AnalyserNode | null>(null);
  const demoContextRef = useRef<AudioContext | null>(null);
  const demoTimeRef = useRef(0);

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
      if (isDemoMode && demoAnalyserRef.current && state.isPlaying) {
        const analyser = demoAnalyserRef.current;
        const frequencyData = new Uint8Array(analyser.frequencyBinCount);
        const timeDomainData = new Uint8Array(analyser.frequencyBinCount);

        analyser.getByteFrequencyData(frequencyData);
        analyser.getByteTimeDomainData(timeDomainData);

        // Calculate frequency bands
        const bufferLength = frequencyData.length;
        const bassEnd = Math.floor(bufferLength / 8);
        const midsEnd = Math.floor(bufferLength / 2);

        let bassSum = 0, midsSum = 0, highsSum = 0, total = 0;
        for (let i = 0; i < bufferLength; i++) {
          total += frequencyData[i];
          if (i < bassEnd) bassSum += frequencyData[i];
          else if (i < midsEnd) midsSum += frequencyData[i];
          else highsSum += frequencyData[i];
        }

        setAudioData({
          frequencyData,
          timeDomainData,
          bass: bassSum / bassEnd / 255,
          mids: midsSum / (midsEnd - bassEnd) / 255,
          highs: highsSum / (bufferLength - midsEnd) / 255,
          average: total / bufferLength / 255,
        });

        // Update demo time
        demoTimeRef.current += 1 / 60;
        setState(prev => ({ ...prev, currentTime: demoTimeRef.current }));
      } else if (audioProcessor.isReady && state.isPlaying) {
        const data = audioProcessor.getAudioData();
        setAudioData(data);
      }
      animationFrameRef.current = requestAnimationFrame(updateAudioData);
    };

    animationFrameRef.current = requestAnimationFrame(updateAudioData);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [state.isPlaying, isDemoMode]);

  const initializeAudio = useCallback(async () => {
    if (!audioRef.current || isInitializedRef.current) return;
    await audioProcessor.initialize(audioRef.current);
    isInitializedRef.current = true;
  }, []);

  const startDemo = useCallback(async () => {
    // Stop any existing demo
    if (demoGeneratorRef.current) {
      demoGeneratorRef.current.stop();
    }
    if (demoContextRef.current) {
      demoContextRef.current.close();
    }

    // Create new demo audio context and analyzer
    demoContextRef.current = new AudioContext();
    demoAnalyserRef.current = demoContextRef.current.createAnalyser();
    demoAnalyserRef.current.fftSize = 2048;
    demoAnalyserRef.current.smoothingTimeConstant = 0.8;

    // Create oscillator-based demo
    demoGeneratorRef.current = new DemoAudioGenerator();

    // Create master gain
    const masterGain = demoContextRef.current.createGain();
    masterGain.gain.value = state.volume;
    masterGain.connect(demoAnalyserRef.current);
    demoAnalyserRef.current.connect(demoContextRef.current.destination);

    // Start generating audio
    startDemoBeat(demoContextRef.current, masterGain);

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
  }, [state.volume]);

  const stopDemo = useCallback(() => {
    if (demoContextRef.current) {
      demoContextRef.current.close();
      demoContextRef.current = null;
    }
    demoAnalyserRef.current = null;
    demoGeneratorRef.current = null;
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
    // Stop demo if running
    if (isDemoMode) {
      stopDemo();
    }

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
  }, [initializeAudio, isDemoMode, stopDemo]);

  const play = useCallback(async () => {
    if (isDemoMode) {
      // Resume demo context if suspended
      if (demoContextRef.current?.state === 'suspended') {
        await demoContextRef.current.resume();
      }
      setState(prev => ({ ...prev, isPlaying: true }));
      return;
    }

    if (!audioRef.current || !state.currentTrack) return;

    await audioProcessor.resume();
    await audioRef.current.play();
  }, [state.currentTrack, isDemoMode]);

  const pause = useCallback(() => {
    if (isDemoMode) {
      demoContextRef.current?.suspend();
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
    if (isDemoMode) return; // Can't seek demo
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(time, state.duration));
  }, [state.duration, isDemoMode]);

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

// Helper function to generate demo beat
function startDemoBeat(ctx: AudioContext, destination: GainNode): void {
  const bpm = 120;
  const beatInterval = 60 / bpm;
  let beatCount = 0;

  const scheduleBeat = () => {
    if (ctx.state === 'closed') return;

    const now = ctx.currentTime;
    const beat = beatCount % 8;

    // Kick on 0, 2, 4, 6
    if (beat % 2 === 0) {
      playKick(ctx, destination, now);
    }

    // Snare on 2, 6
    if (beat === 2 || beat === 6) {
      playSnare(ctx, destination, now);
    }

    // Hi-hat every beat
    playHiHat(ctx, destination, now);

    // Bass
    if (beat % 2 === 0) {
      const notes = [55, 55, 73.42, 65.41];
      playBass(ctx, destination, now, notes[Math.floor(beat / 2)]);
    }

    // Arpeggio
    playArp(ctx, destination, now, beat);

    beatCount++;
    setTimeout(scheduleBeat, beatInterval * 1000);
  };

  scheduleBeat();
}

function playKick(ctx: AudioContext, dest: GainNode, time: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(30, time + 0.1);
  gain.gain.setValueAtTime(0.8, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
  osc.connect(gain).connect(dest);
  osc.start(time);
  osc.stop(time + 0.3);
}

function playSnare(ctx: AudioContext, dest: GainNode, time: number): void {
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
  noise.connect(filter).connect(gain).connect(dest);
  noise.start(time);
  noise.stop(time + 0.15);
}

function playHiHat(ctx: AudioContext, dest: GainNode, time: number): void {
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
  noise.connect(filter).connect(gain).connect(dest);
  noise.start(time);
  noise.stop(time + 0.03);
}

function playBass(ctx: AudioContext, dest: GainNode, time: number, freq: number): void {
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
  osc.connect(filter).connect(gain).connect(dest);
  osc.start(time);
  osc.stop(time + 0.45);
}

function playArp(ctx: AudioContext, dest: GainNode, time: number, beat: number): void {
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
  filter.connect(gain).connect(dest);

  osc.start(time);
  osc.stop(time + 0.22);
  osc2.start(time);
  osc2.stop(time + 0.22);
}
