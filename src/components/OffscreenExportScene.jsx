import React, { useRef, useEffect } from 'react';
import Scene from './Scene';

const OffscreenExportScene = ({
    width = 3840,
    height = 2160,
    imageUrl,
    params,
    manualTime,
    bgColor,
    onCanvasReady
}) => {
    const containerRef = useRef(null);

    // Detect internal canvas creation
    useEffect(() => {
        if (containerRef.current) {
            const canvas = containerRef.current.querySelector('canvas');
            if (canvas && onCanvasReady) {
                onCanvasReady(canvas);
            }
        }
    }, [onCanvasReady]);

    return (
        <div
            ref={containerRef}
            style={{
                position: 'fixed',
                left: '100vw', // Move out of viewport
                top: 0,
                width: `${width}px`,
                height: `${height}px`,
                // Do NOT use display: none or visibility: hidden as it might stop rendering
                pointerEvents: 'none',
                zIndex: -9999,
                background: bgColor
            }}
        >
            <Scene
                imageUrl={imageUrl}
                params={params}
                isPlaying={false} // Always controlled manually
                bgColor={bgColor}
                manualTime={manualTime}
                isExporting={true}
                // Force high CPR to 1 because we are resizing the actual canvas to 4K pixels
                // If we used DPR 2 on a 4K canvas it would be 8K render buffer!
                exportDpr={1}
                quality="high" // Force high quality for export
            />
        </div>
    );
};

export default OffscreenExportScene;
