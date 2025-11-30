// Audio Types
export interface AudioData {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  bass: number;
  mids: number;
  highs: number;
  average: number;
}

export interface Track {
  id: string;
  name: string;
  artist?: string;
  duration: number;
  file: File;
  url: string;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  balance: number;
  currentTrack: Track | null;
  playlist: Track[];
}

export interface EQBand {
  frequency: number;
  gain: number;
  label: string;
}

export interface EQState {
  enabled: boolean;
  preamp: number;
  bands: EQBand[];
  preset: string;
}

export interface VisualizerPreset {
  id: string;
  name: string;
  type: 'bars' | 'waveform' | 'particles' | 'tunnel';
}

// Shader uniforms type
export interface VisualizerUniforms {
  uTime: { value: number };
  uBass: { value: number };
  uMids: { value: number };
  uHighs: { value: number };
  uFrequencyData: { value: Float32Array };
}
