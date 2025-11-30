# Winamp Visualizer

A retro-styled audio player that mimics the classic Winamp aesthetic, featuring a real-time 3D audio visualizer with synthwave/Milkdrop-style visuals.

![Winamp Visualizer](https://img.shields.io/badge/React-18-blue) ![Three.js](https://img.shields.io/badge/Three.js-WebGL-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## Features

- **Classic Winamp UI**: Brushed metal chrome, beveled buttons, LCD time display, scrolling track marquee
- **4 Visualizer Modes**:
  - Frequency spectrum bars (3D extruded)
  - Waveform line visualization
  - Audio-reactive particle system
  - Tunnel/grid effect
- **Synthwave Aesthetics**: Neon grid, animated sun, bloom post-processing, CRT scanlines
- **10-Band Equalizer**: With presets (Rock, Pop, Jazz, Classical, Electronic, Bass, Treble)
- **Playlist Manager**: Drag-and-drop file support for MP3, WAV, FLAC, OGG, M4A
- **Real-time Audio Analysis**: FFT frequency extraction, beat detection, bass/mids/highs separation
- **Keyboard Shortcuts**:
  - `Space`: Play/Pause
  - `Arrow Left/Right`: Seek -/+ 5 seconds
  - `Arrow Up/Down`: Volume control
  - `E`: Toggle Equalizer
  - `P`: Toggle Playlist

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| 3D Rendering | Three.js with WebGL |
| Audio Processing | Web Audio API |
| Shaders | GLSL (custom synthwave effects) |

## Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/winamp-visualizer.git
cd winamp-visualizer

# Install dependencies
npm install

# Start development server
npm run dev
```

### Usage

1. Open http://localhost:5173 in your browser
2. Click "+ ADD" in the playlist panel or drag audio files onto it
3. Press play or double-click a track to start playback
4. Click the mode button in the visualizer to cycle through visual styles
5. Use the EQ panel to adjust frequency response

## Project Structure

```
src/
├── audio/
│   ├── audioProcessor.ts    # Web Audio API wrapper with FFT
│   └── fftAnalyzer.ts       # Beat detection & spectral analysis
├── components/
│   ├── Player.tsx           # Main Winamp player window
│   ├── Visualizer.tsx       # Three.js 3D visualizer
│   ├── Equalizer.tsx        # 10-band EQ panel
│   ├── Playlist.tsx         # Playlist manager
│   └── TransportControls.tsx
├── hooks/
│   └── useAudioPlayer.ts    # Audio state management
├── styles/
│   └── winamp.css           # Winamp chrome/window styles
├── types/
│   └── index.ts             # TypeScript definitions
├── visuals/
│   ├── scene.ts             # Three.js scene manager
│   └── shaders/
│       └── synthwave.ts     # GLSL shaders (grid, sun, CRT)
└── App.tsx
```

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## License

MIT
