import React, { useState } from 'react';
import Scene from './components/Scene';
import Sidebar from './components/Sidebar';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import OffscreenExportScene from './components/OffscreenExportScene';
import { useEffect, useRef } from 'react'; // Ensure React hooks are imported if used directly (although we use React.useState etc)
// Debugging Error Boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("Uncaught error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'white', background: 'red', position: 'absolute', top: 0, left: 0, zIndex: 9999 }}>
          <h1>Terjadi kesalahan.</h1>
          <pre>{this.state.error && this.state.error.toString()}</pre>
          <p>Periksa konsol untuk detail.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [flagImage, setFlagImage] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isExporting, setIsExporting] = useState(false); // High-Res Mode state
  const [isPlaying, setIsPlaying] = useState(true);
  const [bgColor, setBgColor] = useState('#0f0f11');
  const [exportDuration, setExportDuration] = useState(5);
  const [manualTime, setManualTime] = useState(null);
  const [exportProgress, setExportProgress] = useState(0);

  const [params, setParams] = useState({
    speed: 1.0,
    amplitude: 0.3,
    frequency: 2.0,
    noiseStrength: 0.5,
    specularStrength: 0.1, // Default to Matte
    translucencyStrength: 0.3, // New: See-through
    rotation: [0, -0.2, 0],
    scale: 1.0,
    positionX: 0,
    positionY: 0,
    lightIntensity: 1.2,
    fov: 45,
    quality: 'medium' // low, medium, high
  });

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (flagImage) URL.revokeObjectURL(flagImage);
      const url = URL.createObjectURL(file);
      setFlagImage(url);
    }
  };

  const applyPreset = (type) => {
    switch (type) {
      case 'strong': // Badai (Rough, Matte)
        setParams(p => ({ ...p, speed: 2.5, amplitude: 0.8, frequency: 1.5, noiseStrength: 1.0, specularStrength: 0.05, translucencyStrength: 0.1 }));
        break;
      case 'soft': // Sutra/Slow (Glossy, Thin)
        setParams(p => ({ ...p, speed: 0.5, amplitude: 0.2, frequency: 3.0, noiseStrength: 0.2, specularStrength: 0.8, translucencyStrength: 0.6 }));
        break;
      case 'balanced': // Normal (Standard)
        setParams(p => ({ ...p, speed: 1.0, amplitude: 0.3, frequency: 2.0, noiseStrength: 0.5, specularStrength: 0.1, translucencyStrength: 0.3 }));
        break;
    }
  };

  // New Export Logic using Offscreen Renderer
  const [exportCanvas, setExportCanvas] = useState(null);
  const [exportMode, setExportMode] = useState(null); // 'live', 'render', 'snapshot'
  const isExportingRef = useRef(false); // Safety ref for loop cancellation

  // --- MODE 2: SNAPSHOT (4K Image) ---
  const takeSnapshot = () => {
    if (isRecording) return;
    setIsExporting(true);
    setExportMode('snapshot');
    // OffscreenExportScene will mount and trigger effect
  };

  // --- MODE 3: HIGH QUALITY RENDER (Frame-by-Frame) ---
  const startRender = () => {
    if (isRecording) return;
    setIsExporting(true);
    isExportingRef.current = true; // Set safety flag
    setExportMode('render');
    setIsPlaying(false);
    setExportProgress(0);
  };

  const cancelRender = () => {
    isExportingRef.current = false; // Kill the loop
    setIsExporting(false);
    setExportMode(null);
    setExportCanvas(null);
    setIsRecording(false);
  };

  // Unified Effect for Snapshot & Render
  useEffect(() => {
    if (isExporting && exportCanvas && exportMode) {
      if (exportMode === 'snapshot') {
        runSnapshot(exportCanvas);
      } else if (exportMode === 'render') {
        // slight delay to let UI settle
        setTimeout(() => runExportLoop(exportCanvas), 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExporting, exportCanvas, exportMode]);

  const runSnapshot = async (canvas) => {
    try {
      // Wait a moment for render
      await new Promise(r => setTimeout(r, 100));

      // Save
      const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `flag-snapshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`;
      a.click();
    } catch (err) {
      console.error("Snapshot failed:", err);
      alert("Gagal mengambil foto: " + err.message);
    } finally {
      setIsExporting(false);
      setExportMode(null);
      setExportCanvas(null);
    }
  };


  const runExportLoop = async (canvas) => {
    // 1. Setup
    setIsRecording(true);
    console.log("Starting 4K Export. Canvas dimensions:", canvas.width, "x", canvas.height);

    try {
      // 2. Configure Video Encoder
      const config = {
        codec: 'avc1.640034', // H.264 High Profile Level 5.2 for 4K 60FPS
        width: canvas.width,
        height: canvas.height,
        bitrate: 25_000_000, // 25 Mbps for 4K 60FPS
        framerate: 60
      };

      // Check if this configuration is supported
      const support = await VideoEncoder.isConfigSupported(config);
      if (!support.supported) {
        throw new Error(`Browser Anda tidak mendukung encoding video Resolusi ${canvas.width}x${canvas.height} @ 60FPS dengan konfigurasi ini. Coba kurangi resolusi atau gunakan browser lain (Chrome/Edge terbaru).`);
      }

      // 3. Initialize Muxer
      const muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: {
          codec: 'avc',
          width: canvas.width,
          height: canvas.height
        },
        fastStart: 'in-memory'
      });

      // 4. Initialize VideoEncoder
      const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => {
          console.error("VideoEncoder error:", e);
          alert("Terjadi kesalahan pada VideoEncoder: " + e.message);
          isExportingRef.current = false; // Stop loop
        }
      });

      videoEncoder.configure(config);

      // 5. Frame-by-Frame Loop
      const fps = 60;
      const totalFrames = Math.ceil(exportDuration * fps);

      for (let i = 0; i < totalFrames; i++) {
        // Loop Safety Check
        if (!isExportingRef.current) {
          console.log("Export cancelled by user.");
          break;
        }

        const time = i / fps;
        setManualTime(time); // Drive the animation (both main and offscreen scenes will update)

        // Wait for React to propagate changes & Canvas to render
        // INCREASED DELAY to prevent UI freezing
        await new Promise(r => setTimeout(r, 20));

        // Prevent memory overload & sync progress bar with actual encoding
        while (videoEncoder.encodeQueueSize > 3) {
            await new Promise(r => setTimeout(r, 15));
        }

        // Create VideoFrame from the OFFSCREEN canvas
        const frame = new VideoFrame(canvas, { timestamp: i * (1000000 / fps) });

        videoEncoder.encode(frame, { keyFrame: i % 60 === 0 }); // Keyframe every 1 second (60 frames)
        frame.close();

        setExportProgress(Math.round(((i + 1) / totalFrames) * 99)); // Max 99% during loop

        // Yield to main thread to keep UI responsive
        await new Promise(r => setTimeout(r, 0));
      }

      // 6. Finalize only if not cancelled
      if (isExportingRef.current) {
        await videoEncoder.flush();
        videoEncoder.close();
        setExportProgress(100);
        muxer.finalize();
        const { buffer } = muxer.target;
        const blob = new Blob([buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flag-animation-${exportDuration}s-4k.mp4`;
        a.click();
        URL.revokeObjectURL(url);
      }

    } catch (err) {
      console.error("Export failed:", err);
      alert("Gagal mengekspor video 4K: " + err.message);
    } finally {
      // Cleanup
      isExportingRef.current = false;
      setIsRecording(false);
      setIsExporting(false); // This will unmount the offscreen scene
      setExportCanvas(null);
      setManualTime(null); // Reset manual time to let normal loop resume
      setExportProgress(0);
      setExportMode(null);
      setIsPlaying(true); // Resume preview
    }
  };

  return (
    <ErrorBoundary>
      <div className="app-container">

        {/* Hidden Offscreen Export Scene */}
        {isExporting && (
          <OffscreenExportScene
            width={3840}
            height={2160}
            imageUrl={flagImage}
            params={params}
            manualTime={manualTime}
            bgColor={bgColor}
            onCanvasReady={setExportCanvas}
          />
        )}

        {/* Progress Bar Overlay */}
        {isRecording && exportMode === 'render' && (
          <div className="recording-overlay">
            <h3 style={{ margin: 0 }}>{exportProgress >= 99 ? "Menyelesaikan (Menyimpan File)..." : "Mengekspor Video (4K)..."}</h3>
            <div style={{ width: '300px', height: '20px', background: '#333', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${exportProgress}%`, height: '100%', background: '#4CAF50', transition: 'width 0.1s' }} />
            </div>
            <p style={{ margin: 0, fontWeight: 'bold' }}>{exportProgress}%</p>

            <button
              onClick={cancelRender}
              style={{
                background: '#ff4444', color: 'white', border: 'none',
                padding: '8px 20px', borderRadius: '5px', cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Batal
            </button>
          </div>
        )}
        {/* 1. Preview Area */}
        <div className="preview-area" style={{ background: bgColor === '#0f0f11' ? undefined : bgColor }}>
          <div className="canvas-wrapper">
            {/* Main Scene - Paused during export if desired, but manualTime drives it currently */}
            <Scene
              imageUrl={flagImage}
              params={params}
              isPlaying={isPlaying && !isExporting} // Stop internal loop during export
              bgColor={bgColor}
              isExporting={isExporting}
              exportDpr={1} // Normal DPR for preview
              manualTime={manualTime}
              quality={params.quality} // Dynamic preview quality
            />
          </div>

          <div className="playback-controls">
            <button
              className="playback-btn"
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? "Jeda" : "Putar"}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
              ) : (
                <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              )}
            </button>
          </div>
        </div>

        {/* 2. Sidebar Controls */}
        <Sidebar
          params={params}
          setParams={setParams}
          onUpload={handleImageUpload}
          onExport={{
            startRender,
            takeSnapshot,
            mode: exportMode
          }}
          isRecording={isRecording}
          bgColor={bgColor}
          setBgColor={setBgColor}
          applyPreset={applyPreset}
          exportDuration={exportDuration}
          setExportDuration={setExportDuration}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;
