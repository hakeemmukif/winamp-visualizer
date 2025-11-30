import { useRef, useCallback } from 'react';
import type { Track } from '../types';
import './Playlist.css';

interface PlaylistProps {
  tracks: Track[];
  currentTrack: Track | null;
  onSelectTrack: (trackId: string) => void;
  onAddFiles: (files: FileList) => void;
  onRemoveTrack: (trackId: string) => void;
  onClearPlaylist: () => void;
  visible?: boolean;
  onClose?: () => void;
}

export function Playlist({
  tracks,
  currentTrack,
  onSelectTrack,
  onAddFiles,
  onRemoveTrack,
  onClearPlaylist,
  visible = true,
  onClose,
}: PlaylistProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onAddFiles(e.target.files);
        e.target.value = ''; // Reset for re-selection
      }
    },
    [onAddFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        onAddFiles(e.dataTransfer.files);
      }
    },
    [onAddFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const formatDuration = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!visible) return null;

  return (
    <div className="playlist-panel winamp-window">
      <div className="winamp-titlebar">
        <span className="titlebar-text">WINAMP PLAYLIST</span>
        <button className="titlebar-btn close-btn" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <div className="playlist-content" onDrop={handleDrop} onDragOver={handleDragOver}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a"
          multiple
          style={{ display: 'none' }}
        />

        <div className="playlist-tracks">
          {tracks.length === 0 ? (
            <div className="playlist-empty">
              <p>Drop audio files here</p>
              <p>or click + ADD to browse</p>
            </div>
          ) : (
            tracks.map((track, index) => (
              <div
                key={track.id}
                className={`playlist-track ${currentTrack?.id === track.id ? 'active' : ''}`}
                onClick={() => onSelectTrack(track.id)}
                onDoubleClick={() => onSelectTrack(track.id)}
              >
                <span className="track-number">{index + 1}.</span>
                <span className="track-name" title={track.name}>
                  {track.artist ? `${track.artist} - ` : ''}
                  {track.name}
                </span>
                <span className="track-duration">{formatDuration(track.duration)}</span>
                <button
                  className="track-remove-btn"
                  onClick={e => {
                    e.stopPropagation();
                    onRemoveTrack(track.id);
                  }}
                  aria-label="Remove track"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        <div className="playlist-controls">
          <button className="playlist-btn" onClick={handleAddClick} title="Add files">
            + ADD
          </button>
          <button
            className="playlist-btn"
            onClick={() => currentTrack && onRemoveTrack(currentTrack.id)}
            disabled={!currentTrack}
            title="Remove selected"
          >
            - REM
          </button>
          <button className="playlist-btn" onClick={onClearPlaylist} title="Clear playlist">
            CLEAR
          </button>
          <div className="playlist-info">
            {tracks.length} track{tracks.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
