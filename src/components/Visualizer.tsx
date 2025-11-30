import { useEffect, useRef, useCallback } from 'react';
import { VisualizerScene, type VisualizerType } from '../visuals/scene';
import type { AudioData } from '../types';
import './Visualizer.css';

interface VisualizerProps {
  audioData: AudioData | null;
  type?: VisualizerType;
  onTypeChange?: (type: VisualizerType) => void;
}

export function Visualizer({ audioData, type = 'bars', onTypeChange }: VisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<VisualizerScene | null>(null);
  const animationRef = useRef<number>(0);
  const audioDataRef = useRef<AudioData | null>(null);

  // Keep audioData ref updated
  useEffect(() => {
    audioDataRef.current = audioData;
  }, [audioData]);

  // Initialize scene
  useEffect(() => {
    if (!containerRef.current) return;

    sceneRef.current = new VisualizerScene(containerRef.current);

    // Animation loop - uses ref to always get latest audioData
    const animate = () => {
      if (sceneRef.current) {
        sceneRef.current.update(audioDataRef.current);
        sceneRef.current.render();
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      sceneRef.current?.destroy();
      sceneRef.current = null;
    };
  }, []);

  // Handle visualizer type change
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setVisualizerType(type);
    }
  }, [type]);

  const cycleVisualizerType = useCallback(() => {
    const types: VisualizerType[] = ['bars', 'waveform', 'particles', 'tunnel'];
    const currentIndex = types.indexOf(type);
    const nextIndex = (currentIndex + 1) % types.length;
    onTypeChange?.(types[nextIndex]);
  }, [type, onTypeChange]);

  return (
    <div className="visualizer-container" ref={containerRef}>
      <div className="visualizer-overlay">
        <button
          className="visualizer-mode-btn"
          onClick={cycleVisualizerType}
          title="Change visualization"
        >
          {type.toUpperCase()}
        </button>
      </div>
    </div>
  );
}
