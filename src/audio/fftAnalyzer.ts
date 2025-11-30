import type { AudioData } from '../types';

export interface BeatDetectionResult {
  isBeat: boolean;
  beatIntensity: number;
  bpm: number;
}

export class FFTAnalyzer {
  private beatThreshold = 1.3;
  private beatDecay = 0.98;
  private beatMin = 0.15;
  private lastBeatTime = 0;
  private beatHistory: number[] = [];
  private energyHistory: number[] = [];
  private readonly historySize = 43; // ~1 second at 60fps

  analyzeBeat(audioData: AudioData): BeatDetectionResult {
    const currentEnergy = audioData.bass * 0.6 + audioData.mids * 0.3 + audioData.highs * 0.1;

    // Add to energy history
    this.energyHistory.push(currentEnergy);
    if (this.energyHistory.length > this.historySize) {
      this.energyHistory.shift();
    }

    // Calculate average energy
    const averageEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;

    // Detect beat
    const now = performance.now();
    const minBeatInterval = 200; // Minimum 200ms between beats (300 BPM max)
    const isBeat =
      currentEnergy > averageEnergy * this.beatThreshold &&
      currentEnergy > this.beatMin &&
      now - this.lastBeatTime > minBeatInterval;

    if (isBeat) {
      // Record beat timing
      this.beatHistory.push(now);
      if (this.beatHistory.length > 10) {
        this.beatHistory.shift();
      }
      this.lastBeatTime = now;
    }

    // Calculate BPM from beat history
    const bpm = this.calculateBPM();

    return {
      isBeat,
      beatIntensity: currentEnergy / Math.max(averageEnergy, 0.01),
      bpm,
    };
  }

  private calculateBPM(): number {
    if (this.beatHistory.length < 3) return 0;

    // Calculate average interval between beats
    let totalInterval = 0;
    for (let i = 1; i < this.beatHistory.length; i++) {
      totalInterval += this.beatHistory[i] - this.beatHistory[i - 1];
    }
    const averageInterval = totalInterval / (this.beatHistory.length - 1);

    // Convert to BPM
    if (averageInterval > 0) {
      const bpm = (60 * 1000) / averageInterval;
      return Math.round(Math.max(60, Math.min(200, bpm))); // Clamp to reasonable range
    }

    return 0;
  }

  getSpectralCentroid(frequencyData: Uint8Array): number {
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < frequencyData.length; i++) {
      numerator += i * frequencyData[i];
      denominator += frequencyData[i];
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  getSpectralRolloff(frequencyData: Uint8Array, percentage = 0.85): number {
    const totalEnergy = frequencyData.reduce((a, b) => a + b, 0);
    const threshold = totalEnergy * percentage;

    let cumulativeEnergy = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      cumulativeEnergy += frequencyData[i];
      if (cumulativeEnergy >= threshold) {
        return i / frequencyData.length;
      }
    }

    return 1;
  }

  getZeroCrossingRate(timeDomainData: Uint8Array): number {
    let crossings = 0;
    const center = 128; // Center point for unsigned byte data

    for (let i = 1; i < timeDomainData.length; i++) {
      if (
        (timeDomainData[i - 1] < center && timeDomainData[i] >= center) ||
        (timeDomainData[i - 1] >= center && timeDomainData[i] < center)
      ) {
        crossings++;
      }
    }

    return crossings / timeDomainData.length;
  }

  reset(): void {
    this.beatHistory = [];
    this.energyHistory = [];
    this.lastBeatTime = 0;
  }
}

export const fftAnalyzer = new FFTAnalyzer();
