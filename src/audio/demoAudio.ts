// Demo audio generator using Web Audio API oscillators
// Creates a synthwave-style beat without requiring external audio files

export class DemoAudioGenerator {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private scheduledNodes: AudioScheduledSourceNode[] = [];
  private intervalId: number | null = null;
  private startTime = 0;

  // Musical parameters
  private bpm = 120;
  private beatInterval: number;

  constructor() {
    this.beatInterval = 60 / this.bpm;
  }

  async start(): Promise<MediaStream> {
    this.audioContext = new AudioContext();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.5;

    // Create a MediaStreamDestination to capture audio
    const destination = this.audioContext.createMediaStreamDestination();
    this.masterGain.connect(destination);
    this.masterGain.connect(this.audioContext.destination);

    this.isPlaying = true;
    this.startTime = this.audioContext.currentTime;

    // Start the beat loop
    this.scheduleBeat();
    this.intervalId = window.setInterval(() => {
      if (this.isPlaying) {
        this.scheduleBeat();
      }
    }, this.beatInterval * 1000);

    return destination.stream;
  }

  private scheduleBeat(): void {
    if (!this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;
    const beatInMeasure = Math.floor((now - this.startTime) / this.beatInterval) % 8;

    // Kick drum on beats 0, 2, 4, 6
    if (beatInMeasure % 2 === 0) {
      this.playKick(now);
    }

    // Snare on beats 2 and 6
    if (beatInMeasure === 2 || beatInMeasure === 6) {
      this.playSnare(now);
    }

    // Hi-hat on every beat
    this.playHiHat(now);

    // Bass note (changes every 2 beats)
    if (beatInMeasure % 2 === 0) {
      const bassNotes = [55, 55, 73.42, 65.41]; // A1, A1, D2, C2
      const noteIndex = Math.floor(beatInMeasure / 2);
      this.playBass(now, bassNotes[noteIndex]);
    }

    // Synth arpeggio
    this.playArpeggio(now, beatInMeasure);
  }

  private playKick(time: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.1);

    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.3);
    this.scheduledNodes.push(osc);
  }

  private playSnare(time: number): void {
    if (!this.audioContext || !this.masterGain) return;

    // Noise component
    const bufferSize = this.audioContext.sampleRate * 0.2;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.audioContext.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.5, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.2);
    this.scheduledNodes.push(noise);

    // Tone component
    const osc = this.audioContext.createOscillator();
    const oscGain = this.audioContext.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.05);
    oscGain.gain.setValueAtTime(0.3, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.1);
    this.scheduledNodes.push(osc);
  }

  private playHiHat(time: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const bufferSize = this.audioContext.sampleRate * 0.05;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.05);
    this.scheduledNodes.push(noise);
  }

  private playBass(time: number, frequency: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.value = frequency;

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(200, time + 0.3);

    gain.gain.setValueAtTime(0.4, time);
    gain.gain.setValueAtTime(0.4, time + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.5);
    this.scheduledNodes.push(osc);
  }

  private playArpeggio(time: number, beat: number): void {
    if (!this.audioContext || !this.masterGain) return;

    // A minor pentatonic arpeggio notes
    const notes = [220, 261.63, 329.63, 392, 440, 523.25];
    const noteIndex = beat % notes.length;
    const frequency = notes[noteIndex];

    const osc = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.value = frequency;

    osc2.type = 'square';
    osc2.frequency.value = frequency * 1.005; // Slight detune for thickness

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, time);
    filter.frequency.exponentialRampToValueAtTime(500, time + 0.2);
    filter.Q.value = 5;

    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.25);
    osc2.start(time);
    osc2.stop(time + 0.25);

    this.scheduledNodes.push(osc, osc2);
  }

  stop(): void {
    this.isPlaying = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.scheduledNodes.forEach(node => {
      try {
        node.stop();
      } catch {
        // Already stopped
      }
    });
    this.scheduledNodes = [];

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  get playing(): boolean {
    return this.isPlaying;
  }
}

export const demoAudioGenerator = new DemoAudioGenerator();
