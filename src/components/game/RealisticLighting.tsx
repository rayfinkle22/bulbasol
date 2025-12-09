import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function RealisticLighting() {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const { scene } = useThree();
  
  useFrame(() => {
    if (sunRef.current) {
      // Enable shadows
      sunRef.current.castShadow = true;
      sunRef.current.shadow.mapSize.width = 2048;
      sunRef.current.shadow.mapSize.height = 2048;
      sunRef.current.shadow.camera.near = 0.5;
      sunRef.current.shadow.camera.far = 100;
      sunRef.current.shadow.camera.left = -30;
      sunRef.current.shadow.camera.right = 30;
      sunRef.current.shadow.camera.top = 30;
      sunRef.current.shadow.camera.bottom = -30;
      sunRef.current.shadow.bias = -0.0005;
    }
  });

  return (
    <>
      {/* Main sunlight - warm golden hour */}
      <directionalLight
        ref={sunRef}
        position={[20, 30, 15]}
        intensity={1.8}
        color="#fff5e0"
        castShadow
      />
      
      {/* Sky ambient - blue fill */}
      <ambientLight intensity={0.35} color="#8899bb" />
      
      {/* Hemisphere light for natural sky/ground color */}
      <hemisphereLight
        args={['#87ceeb', '#3a5a25', 0.6]}
        position={[0, 50, 0]}
      />
      
      {/* Rim light from behind - atmospheric */}
      <directionalLight
        position={[-15, 10, -20]}
        intensity={0.4}
        color="#ffd4a0"
      />
      
      {/* Fill light to soften shadows */}
      <directionalLight
        position={[-10, 5, 10]}
        intensity={0.25}
        color="#99aacc"
      />
      
      {/* Ground bounce light */}
      <pointLight
        position={[0, 0.5, 0]}
        intensity={0.15}
        color="#5a7a4a"
        distance={20}
      />
      
      {/* Fog for depth and atmosphere */}
      <fog attach="fog" args={['#c5d8c5', 25, 60]} />
    </>
  );
}

export function ForestSkybox() {
  return (
    <>
      {/* Sky dome */}
      <mesh position={[0, 0, 0]} scale={[-1, 1, 1]}>
        <sphereGeometry args={[80, 32, 32]} />
        <meshBasicMaterial 
          color="#7ab5d4" 
          side={THREE.BackSide}
        />
      </mesh>
      
      {/* Clouds layer */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 50 + Math.sin(i * 2.5) * 10;
        return (
          <mesh 
            key={i}
            position={[Math.sin(angle) * radius, 35 + Math.sin(i * 1.3) * 8, Math.cos(angle) * radius]}
            scale={[12 + Math.sin(i) * 4, 2.5, 6 + Math.cos(i) * 2]}
          >
            <sphereGeometry args={[1, 8, 6]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
          </mesh>
        );
      })}
      
      {/* Sun disc */}
      <mesh position={[20, 30, 15]}>
        <circleGeometry args={[3, 32]} />
        <meshBasicMaterial color="#fffae0" />
      </mesh>
      
      {/* Sun glow */}
      <mesh position={[20, 30, 14.9]}>
        <circleGeometry args={[6, 32]} />
        <meshBasicMaterial color="#fff8d0" transparent opacity={0.3} />
      </mesh>
    </>
  );
}
