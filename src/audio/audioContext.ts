// Shared audio context manager for both file playback and demo mode
import type { AudioData, EQBand } from '../types';

class AudioContextManager {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private sourceNode: AudioNode | null = null;
  private frequencyData: Uint8Array = new Uint8Array(0);
  private timeDomainData: Uint8Array = new Uint8Array(0);

  private readonly eqFrequencies = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

  async initialize(): Promise<void> {
    if (this.audioContext) return;

    this.audioContext = new AudioContext();

    // Create analyser
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    // Initialize data arrays
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeDomainData = new Uint8Array(this.analyser.frequencyBinCount);

    // Create master gain
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.75;

    // Create EQ filters
    this.createEQFilters();

    // Connect EQ -> Master Gain -> Analyser -> Destination
    this.connectEQChain();
  }

  private createEQFilters(): void {
    if (!this.audioContext) return;

    this.eqFilters = this.eqFrequencies.map((freq, index) => {
      const filter = this.audioContext!.createBiquadFilter();

      if (index === 0) {
        filter.type = 'lowshelf';
      } else if (index === this.eqFrequencies.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
      }

      filter.frequency.value = freq;
      filter.gain.value = 0;
      filter.Q.value = 1.4;

      return filter;
    });
  }

  private connectEQChain(): void {
    if (!this.masterGain || !this.analyser || !this.audioContext) return;

    // Chain EQ filters together
    for (let i = 0; i < this.eqFilters.length - 1; i++) {
      this.eqFilters[i].connect(this.eqFilters[i + 1]);
    }

    // Connect last EQ filter -> master gain -> analyser -> destination
    if (this.eqFilters.length > 0) {
      this.eqFilters[this.eqFilters.length - 1].connect(this.masterGain);
    }
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  }

  get inputNode(): AudioNode | null {
    return this.eqFilters.length > 0 ? this.eqFilters[0] : this.masterGain;
  }

  get context(): AudioContext | null {
    return this.audioContext;
  }

  get isReady(): boolean {
    return this.audioContext !== null;
  }

  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async suspend(): Promise<void> {
    if (this.audioContext?.state === 'running') {
      await this.audioContext.suspend();
    }
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

    const { bass, mids, highs, average } = this.calculateBands();

    return {
      frequencyData: this.frequencyData,
      timeDomainData: this.timeDomainData,
      bass,
      mids,
      highs,
      average,
    };
  }

  private calculateBands(): { bass: number; mids: number; highs: number; average: number } {
    const bufferLength = this.frequencyData.length;
    const bassEnd = Math.floor(bufferLength / 8);
    const midsEnd = Math.floor(bufferLength / 2);

    let bassSum = 0, midsSum = 0, highsSum = 0, total = 0;

    for (let i = 0; i < bufferLength; i++) {
      const value = this.frequencyData[i];
      total += value;
      if (i < bassEnd) bassSum += value;
      else if (i < midsEnd) midsSum += value;
      else highsSum += value;
    }

    return {
      bass: bassSum / bassEnd / 255,
      mids: midsSum / (midsEnd - bassEnd) / 255,
      highs: highsSum / (bufferLength - midsEnd) / 255,
      average: total / bufferLength / 255,
    };
  }

  setVolume(value: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, value));
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

  setEQEnabled(enabled: boolean, bands: EQBand[]): void {
    if (enabled) {
      this.setEQBands(bands);
    } else {
      this.eqFilters.forEach(filter => {
        filter.gain.value = 0;
      });
    }
  }

  disconnectSource(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // Already disconnected
      }
      this.sourceNode = null;
    }
  }

  connectSource(source: AudioNode): void {
    this.disconnectSource();
    this.sourceNode = source;
    if (this.inputNode) {
      source.connect(this.inputNode);
    }
  }

  destroy(): void {
    this.disconnectSource();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.masterGain = null;
    this.eqFilters = [];
  }
}

export const audioContextManager = new AudioContextManager();
