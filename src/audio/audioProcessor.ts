import type { AudioData, EQBand } from '../types';

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private audioElement: HTMLAudioElement | null = null;
  private isInitialized = false;

  // FFT configuration
  private readonly fftSize = 2048;
  private frequencyData: Uint8Array = new Uint8Array(0);
  private timeDomainData: Uint8Array = new Uint8Array(0);

  async initialize(audioElement: HTMLAudioElement): Promise<void> {
    if (this.isInitialized) return;

    this.audioElement = audioElement;
    this.audioContext = new AudioContext();

    // Create analyser node
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = 0.8;

    // Initialize data arrays
    const bufferLength = this.analyser.frequencyBinCount;
    this.frequencyData = new Uint8Array(bufferLength);
    this.timeDomainData = new Uint8Array(bufferLength);

    // Create source node from audio element
    this.sourceNode = this.audioContext.createMediaElementSource(audioElement);

    // Create gain node for volume control
    this.gainNode = this.audioContext.createGain();

    // Create panner node for balance control
    this.pannerNode = this.audioContext.createStereoPanner();

    // Create EQ filters (10-band)
    this.createEQFilters();

    // Connect the audio graph
    this.connectAudioGraph();

    this.isInitialized = true;
  }

  private createEQFilters(): void {
    if (!this.audioContext) return;

    const frequencies = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

    this.eqFilters = frequencies.map((freq, index) => {
      const filter = this.audioContext!.createBiquadFilter();

      if (index === 0) {
        filter.type = 'lowshelf';
      } else if (index === frequencies.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
      }

      filter.frequency.value = freq;
      filter.gain.value = 0;
      filter.Q.value = 1;

      return filter;
    });
  }

  private connectAudioGraph(): void {
    if (!this.sourceNode || !this.analyser || !this.gainNode || !this.pannerNode || !this.audioContext) return;

    // Connect: source -> EQ filters -> gain -> panner -> analyser -> destination
    let currentNode: AudioNode = this.sourceNode;

    // Connect through EQ filters
    this.eqFilters.forEach(filter => {
      currentNode.connect(filter);
      currentNode = filter;
    });

    // Connect rest of chain
    currentNode.connect(this.gainNode);
    this.gainNode.connect(this.pannerNode);
    this.pannerNode.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  }

  getAudioData(): AudioData {
    if (!this.analyser) {
      return {
        frequencyData: new Uint8Array(0),
        timeDomainData: new Uint8Array(0),
        bass: 0,
        mids: 0,
        highs: 0,
        average: 0,
      };
    }

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeDomainData);

    // Calculate frequency bands
    const { bass, mids, highs } = this.calculateFrequencyBands();
    const average = this.calculateAverage();

    return {
      frequencyData: this.frequencyData,
      timeDomainData: this.timeDomainData,
      bass,
      mids,
      highs,
      average,
    };
  }

  private calculateFrequencyBands(): { bass: number; mids: number; highs: number } {
    const bufferLength = this.frequencyData.length;

    // Bass: 0-250Hz (roughly first 1/8 of spectrum)
    const bassEnd = Math.floor(bufferLength / 8);
    let bassSum = 0;
    for (let i = 0; i < bassEnd; i++) {
      bassSum += this.frequencyData[i];
    }
    const bass = bassSum / bassEnd / 255;

    // Mids: 250Hz-4kHz (roughly 1/8 to 1/2 of spectrum)
    const midsStart = bassEnd;
    const midsEnd = Math.floor(bufferLength / 2);
    let midsSum = 0;
    for (let i = midsStart; i < midsEnd; i++) {
      midsSum += this.frequencyData[i];
    }
    const mids = midsSum / (midsEnd - midsStart) / 255;

    // Highs: 4kHz+ (rest of spectrum)
    const highsStart = midsEnd;
    let highsSum = 0;
    for (let i = highsStart; i < bufferLength; i++) {
      highsSum += this.frequencyData[i];
    }
    const highs = highsSum / (bufferLength - highsStart) / 255;

    return { bass, mids, highs };
  }

  private calculateAverage(): number {
    let sum = 0;
    for (let i = 0; i < this.frequencyData.length; i++) {
      sum += this.frequencyData[i];
    }
    return sum / this.frequencyData.length / 255;
  }

  setVolume(value: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  setBalance(value: number): void {
    if (this.pannerNode) {
      this.pannerNode.pan.value = Math.max(-1, Math.min(1, value));
    }
  }

  setEQBand(index: number, gain: number): void {
    if (this.eqFilters[index]) {
      this.eqFilters[index].gain.value = Math.max(-12, Math.min(12, gain));
    }
  }

  setEQBands(bands: EQBand[]): void {
    bands.forEach((band, index) => {
      this.setEQBand(index, band.gain);
    });
  }

  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  destroy(): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.isInitialized = false;
  }

  get context(): AudioContext | null {
    return this.audioContext;
  }

  get isReady(): boolean {
    return this.isInitialized;
  }
}

export const audioProcessor = new AudioProcessor();
