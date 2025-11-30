import './TransportControls.css';

interface TransportControlsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onPrevious: () => void;
  onNext: () => void;
  disabled?: boolean;
}

export function TransportControls({
  isPlaying,
  onPlay,
  onPause,
  onStop,
  onPrevious,
  onNext,
  disabled = false,
}: TransportControlsProps) {
  return (
    <div className="transport-controls">
      <button
        className="transport-btn prev-btn"
        onClick={onPrevious}
        disabled={disabled}
        title="Previous"
        aria-label="Previous track"
      >
        <span className="btn-icon">⏮</span>
      </button>

      <button
        className="transport-btn play-btn"
        onClick={isPlaying ? onPause : onPlay}
        disabled={disabled}
        title={isPlaying ? 'Pause' : 'Play'}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        <span className="btn-icon">{isPlaying ? '⏸' : '▶'}</span>
      </button>

      <button
        className="transport-btn stop-btn"
        onClick={onStop}
        disabled={disabled}
        title="Stop"
        aria-label="Stop"
      >
        <span className="btn-icon">⏹</span>
      </button>

      <button
        className="transport-btn next-btn"
        onClick={onNext}
        disabled={disabled}
        title="Next"
        aria-label="Next track"
      >
        <span className="btn-icon">⏭</span>
      </button>
    </div>
  );
}
