import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

// Vertex Shader (Same as before)
const vertexShader = `
  precision highp float;
  uniform float uTime;
  uniform float uAmplitude;
  uniform float uFrequency;
  uniform float uNoiseStrength;
  
  varying vec2 vUv;
  varying vec3 vViewPosition;
  varying float vElevation;

  // Source: https://github.com/stegu/webgl-noise/blob/master/src/noise2d.glsl
  vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
      + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vUv = uv;
    
    vec3 animatedPosition = position;
    
    // PHYSICS CONSTANTS
    float flowSpeed = 1.0; 
    
    // 1. PROGRESSIVE WAVE (Grumpy/Drag effect)
    // The frequency increases slightly towards the tail (1.0 + uv.x)
    // This makes the flag "whip" at the end.
    float localFreq = uFrequency * (0.8 + vUv.x * 0.5); 
    
    // Main wind swell
    float wave1 = sin(position.x * localFreq - uTime) * uAmplitude;
    
    // Secondary faster ripples
    float wave2 = sin(position.x * (localFreq * 2.5) - uTime * 1.6) * (uAmplitude * 0.25);
    
    // 2. TRAVELING NOISE (Turbulence)
    // The noise texture now moves along the X-axis ( - uTime * 0.8 )
    // This mimics wind flowing *through* the fabric.
    float noiseFlow = snoise(vec2(position.x * 1.5 - uTime * 0.8, position.y * 2.0 + uTime * 0.1));
    float noiseDisplacement = noiseFlow * (uAmplitude * 0.4 * uNoiseStrength);
    
    // Combine raw displacement
    float rawZ = wave1 + wave2 + noiseDisplacement;

    // 3. PINNING & WEIGHT
    // Non-linear pinning: pow(vUv.x, 1.2) makes it stiffer near the pole
    float pinFactor = pow(vUv.x, 1.2); 
    
    animatedPosition.z += rawZ * pinFactor;
    
    // 4. LENGTH COMPENSATION (Realistic retraction)
    // As the flag ripples in Z, it should physically shorten in X.
    // We pull the vertices back slightly based on how strong the wave is.
    animatedPosition.x -= abs(rawZ) * 0.3 * pinFactor;
    
    // 5. Y-AXIS BILLOWING
    // A slight vertical noise to simulate air pockets lifting/dropping the cloth
    float billow = snoise(vec2(position.x * 0.5 - uTime * 0.4, uTime * 0.3));
    animatedPosition.y += billow * (uAmplitude * 0.15) * pinFactor;

    vElevation = animatedPosition.z;

    // Calculate View Position for Fragment Shader
    vec4 mvPosition = modelViewMatrix * vec4(animatedPosition, 1.0);
    vViewPosition = -mvPosition.xyz;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

import { IMAGE_SHADER_SOURCE, modifyImageShader } from '../shaders';

const Flag = ({ imageUrl, params, isPlaying, manualTime = null, quality = 'medium' }) => {
  const meshRef = useRef();
  const [aspectRatio, setAspectRatio] = useState(1.5); // Default 3:2

  // Quality settings
  const segments = useMemo(() => {
    switch (quality) {
      case 'high': return 500; // Increased from 300 for 4K smoothness
      case 'low': return 150;
      case 'medium': default: return 300;
    }
  }, [quality]);

  // Destructure
  const { speed, amplitude, frequency, noiseStrength, specularStrength, translucencyStrength, rotation, scale, positionX, positionY, lightIntensity } = params;

  // Generate Fragment Shader dynamically based on potential params (currently static)
  const fragmentShader = useMemo(() => {
    return modifyImageShader(IMAGE_SHADER_SOURCE, {
      // Future config can be passed here
    });
  }, []); // Re-generate only if config dependency changes

  // Load Texture & Get Height
  const texture = useTexture(imageUrl || '/vite.svg');
  const { gl } = useThree();

  useEffect(() => {
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      // Improve texture quality
      texture.anisotropy = gl.capabilities.getMaxAnisotropy(); // Use max capabilities
      texture.minFilter = THREE.LinearMipmapLinearFilter; // Smooth scaling down
      texture.magFilter = THREE.LinearFilter; // Smooth scaling up

      if (texture.image && texture.image.width && texture.image.height) {
        const ar = texture.image.width / texture.image.height;
        setAspectRatio(prev => {
          if (Math.abs(prev - ar) > 0.01) return ar;
          return prev;
        });
      }
    }
  }, [texture, gl]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTexture: { value: null },
      uAmplitude: { value: amplitude },
      uFrequency: { value: frequency },
      uNoiseStrength: { value: noiseStrength },
      uSpecularStrength: { value: specularStrength },
      uTranslucencyStrength: { value: translucencyStrength },
      uLightIntensity: { value: lightIntensity },
    }),
    []
  );

  useMemo(() => {
    if (uniforms.uTexture) uniforms.uTexture.value = texture;
    uniforms.uAmplitude.value = amplitude;
    uniforms.uFrequency.value = frequency;
    uniforms.uNoiseStrength.value = noiseStrength;
    uniforms.uSpecularStrength.value = specularStrength;
    uniforms.uTranslucencyStrength.value = translucencyStrength;
    uniforms.uLightIntensity.value = lightIntensity;
  }, [texture, amplitude, frequency, noiseStrength, specularStrength, translucencyStrength, lightIntensity, uniforms]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      if (manualTime !== null) {
        meshRef.current.material.uniforms.uTime.value = manualTime * speed * 5.0;
      } else if (isPlaying) {
        meshRef.current.material.uniforms.uTime.value += delta * speed * 5.0;
      }
    }
  });

  // Calculate Geometry dimensions
  // Fix Width at 3.0, Calculate Height
  const flagWidth = 3.0;
  const flagHeight = flagWidth / aspectRatio;

  return (
    <mesh
      ref={meshRef}
      position={[positionX, positionY, 0]}
      rotation={rotation}
      scale={[scale, scale, scale]}
      key={`${aspectRatio}-${segments}`} // Remount geometry if ratio OR quality changes
    >
      <planeGeometry args={[flagWidth, flagHeight, segments, segments]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

export default Flag;
