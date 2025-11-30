import { useState, useCallback } from 'react';
import type { EQBand, EQState } from '../types';
import { audioProcessor } from '../audio/audioProcessor';
import './Equalizer.css';

const DEFAULT_BANDS: EQBand[] = [
  { frequency: 60, gain: 0, label: '60' },
  { frequency: 170, gain: 0, label: '170' },
  { frequency: 310, gain: 0, label: '310' },
  { frequency: 600, gain: 0, label: '600' },
  { frequency: 1000, gain: 0, label: '1K' },
  { frequency: 3000, gain: 0, label: '3K' },
  { frequency: 6000, gain: 0, label: '6K' },
  { frequency: 12000, gain: 0, label: '12K' },
  { frequency: 14000, gain: 0, label: '14K' },
  { frequency: 16000, gain: 0, label: '16K' },
];

const PRESETS: Record<string, number[]> = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  rock: [5, 4, 3, 1, -1, -1, 0, 2, 3, 4],
  pop: [-1, 2, 4, 5, 4, 1, -1, -1, 2, 3],
  jazz: [3, 2, 1, 2, -2, -2, 0, 2, 3, 4],
  classical: [4, 3, 2, 1, -1, -1, 0, 3, 4, 5],
  electronic: [5, 4, 1, -1, -2, 2, 4, 4, 3, 3],
  bass: [6, 5, 4, 2, 0, -2, -3, -3, -2, -2],
  treble: [-3, -2, -1, 0, 1, 3, 5, 6, 6, 6],
};

interface EqualizerProps {
  visible?: boolean;
  onClose?: () => void;
}

export function Equalizer({ visible = true, onClose }: EqualizerProps) {
  const [state, setState] = useState<EQState>({
    enabled: true,
    preamp: 0,
    bands: DEFAULT_BANDS,
    preset: 'flat',
  });

  const handleBandChange = useCallback((index: number, gain: number) => {
    setState(prev => {
      const newBands = [...prev.bands];
      newBands[index] = { ...newBands[index], gain };
      audioProcessor.setEQBand(index, gain);
      return { ...prev, bands: newBands, preset: 'custom' };
    });
  }, []);

  const handlePreampChange = useCallback((value: number) => {
    setState(prev => ({ ...prev, preamp: value }));
  }, []);

  const handlePresetChange = useCallback((preset: string) => {
    const presetValues = PRESETS[preset];
    if (!presetValues) return;

    setState(prev => {
      const newBands = prev.bands.map((band, i) => ({
        ...band,
        gain: presetValues[i],
      }));
      audioProcessor.setEQBands(newBands);
      return { ...prev, bands: newBands, preset };
    });
  }, []);

  const handleToggleEQ = useCallback(() => {
    setState(prev => {
      const newEnabled = !prev.enabled;
      if (newEnabled) {
        audioProcessor.setEQBands(prev.bands);
      } else {
        audioProcessor.setEQBands(prev.bands.map(b => ({ ...b, gain: 0 })));
      }
      return { ...prev, enabled: newEnabled };
    });
  }, []);

  const handleReset = useCallback(() => {
    handlePresetChange('flat');
    handlePreampChange(0);
  }, [handlePresetChange, handlePreampChange]);

  if (!visible) return null;

  return (
    <div className="equalizer-panel winamp-window">
      <div className="winamp-titlebar">
        <span className="titlebar-text">WINAMP EQUALIZER</span>
        <button className="titlebar-btn close-btn" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <div className="eq-content">
        <div className="eq-controls-row">
          <button
            className={`eq-toggle-btn ${state.enabled ? 'active' : ''}`}
            onClick={handleToggleEQ}
          >
            ON
          </button>
          <button className="eq-toggle-btn" onClick={handleReset}>
            AUTO
          </button>

          <select
            className="eq-preset-select"
            value={state.preset}
            onChange={e => handlePresetChange(e.target.value)}
          >
            <option value="flat">Flat</option>
            <option value="rock">Rock</option>
            <option value="pop">Pop</option>
            <option value="jazz">Jazz</option>
            <option value="classical">Classical</option>
            <option value="electronic">Electronic</option>
            <option value="bass">Bass Boost</option>
            <option value="treble">Treble Boost</option>
            {state.preset === 'custom' && <option value="custom">Custom</option>}
          </select>
        </div>

        <div className="eq-sliders-container">
          <div className="eq-preamp">
            <span className="eq-label">PREAMP</span>
            <input
              type="range"
              min="-12"
              max="12"
              step="0.5"
              value={state.preamp}
              onChange={e => handlePreampChange(parseFloat(e.target.value))}
              className="eq-slider vertical"
              aria-label="Preamp"
            />
            <span className="eq-value">{state.preamp > 0 ? '+' : ''}{state.preamp}</span>
          </div>

          <div className="eq-divider" />

          <div className="eq-bands">
            {state.bands.map((band, index) => (
              <div key={band.frequency} className="eq-band">
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={state.enabled ? band.gain : 0}
                  onChange={e => handleBandChange(index, parseFloat(e.target.value))}
                  className="eq-slider vertical"
                  disabled={!state.enabled}
                  aria-label={`${band.label} Hz`}
                />
                <span className="eq-label">{band.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="eq-scale">
          <span>+12 dB</span>
          <span>0 dB</span>
          <span>-12 dB</span>
        </div>
      </div>
    </div>
  );
}
