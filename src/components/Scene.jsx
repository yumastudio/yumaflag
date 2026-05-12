import React, { Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import Flag from './Flag';
import { useEffect } from 'react';

const CameraUpdater = ({ fov }) => {
    const { camera } = useThree();
    useEffect(() => {
        // eslint-disable-next-line react-hooks/exhaustive-deps, react/no-direct-mutation-state
        camera.fov = fov;
        camera.updateProjectionMatrix();
    }, [camera, fov]);
    return null;
};

const Scene = ({ imageUrl, params, isPlaying, bgColor, isExporting, exportDpr, manualTime, quality = 'medium' }) => {
    return (
        <div style={{ width: '100%', height: '100%' }}>
            <Canvas
                camera={{ position: [0, 0, 5], fov: params.fov }}
                gl={{ antialias: true, alpha: true, preserveDrawingBuffer: isExporting }}
                dpr={isExporting ? exportDpr : [1, 2]} // High enough for stored screens, light enough for 60fps
            >
                <CameraUpdater fov={params.fov} />
                <color attach="background" args={[bgColor]} />

                {/* Dynamic Lighting */}
                <ambientLight intensity={params.lightIntensity * 0.4} />
                <directionalLight
                    position={[5, 5, 5]}
                    intensity={params.lightIntensity}
                />

                <Environment preset="city" />

                <Suspense fallback={<mesh><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color="wireframe" /></mesh>}>
                    <Flag key={imageUrl} imageUrl={imageUrl} params={params} isPlaying={isPlaying} manualTime={manualTime} quality={quality} />
                </Suspense>

                <OrbitControls
                    enablePan={true}
                    minDistance={2}
                    maxDistance={20}
                />
            </Canvas>
        </div>
    );
};

export default Scene;
