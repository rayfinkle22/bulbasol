import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function RealisticLighting() {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  
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
      {/* Bright midday sun - strong and warm */}
      <directionalLight
        ref={sunRef}
        position={[25, 50, 20]}
        intensity={2.5}
        color="#fffef5"
        castShadow
      />
      
      {/* Sky ambient - bright blue daylight fill */}
      <ambientLight intensity={0.6} color="#a8c8ff" />
      
      {/* Hemisphere light for bright sunny sky/ground */}
      <hemisphereLight
        args={['#87ceeb', '#90b060', 0.8]}
        position={[0, 50, 0]}
      />
      
      {/* Secondary sun for rim highlights */}
      <directionalLight
        position={[-20, 40, -15]}
        intensity={0.8}
        color="#fff8e0"
      />
      
      {/* Bright fill light */}
      <directionalLight
        position={[-15, 20, 25]}
        intensity={0.5}
        color="#e0f0ff"
      />
      
      {/* Ground bounce - green tint from grass */}
      <pointLight
        position={[0, 1, 0]}
        intensity={0.3}
        color="#80a060"
        distance={30}
      />
      
      {/* Light fog for depth - very subtle for sunny day */}
      <fog attach="fog" args={['#c8e0f0', 40, 100]} />
    </>
  );
}

export function ForestSkybox() {
  return (
    <>
      {/* Bright blue sky dome */}
      <mesh position={[0, 0, 0]} scale={[-1, 1, 1]}>
        <sphereGeometry args={[90, 64, 64]} />
        <meshBasicMaterial 
          color="#4a90d9" 
          side={THREE.BackSide}
        />
      </mesh>
      
      {/* Gradient overlay - lighter at horizon */}
      <mesh position={[0, -20, 0]} scale={[-1, 1, 1]}>
        <sphereGeometry args={[89, 32, 32]} />
        <meshBasicMaterial 
          color="#a8d4f5" 
          side={THREE.BackSide}
          transparent
          opacity={0.6}
        />
      </mesh>
      
      {/* Fluffy white clouds */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 55 + Math.sin(i * 2.5) * 12;
        const y = 40 + Math.sin(i * 1.7) * 10;
        return (
          <group key={i} position={[Math.sin(angle) * radius, y, Math.cos(angle) * radius]}>
            {/* Main cloud body */}
            <mesh scale={[14 + Math.sin(i) * 5, 3.5, 8 + Math.cos(i) * 3]}>
              <sphereGeometry args={[1, 12, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            {/* Cloud puffs */}
            <mesh position={[6, 1, 2]} scale={[6, 3, 5]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[-5, 0.5, -1]} scale={[5, 2.5, 4]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[3, 1.5, -3]} scale={[4, 2, 3]}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        );
      })}
      
      {/* Bright sun disc */}
      <mesh position={[25, 50, 20]}>
        <circleGeometry args={[5, 32]} />
        <meshBasicMaterial color="#ffffd0" />
      </mesh>
      
      {/* Sun glow */}
      <mesh position={[25, 50, 19.8]}>
        <circleGeometry args={[12, 32]} />
        <meshBasicMaterial color="#ffffc0" transparent opacity={0.25} />
      </mesh>
      
      {/* Sun rays effect */}
      <mesh position={[25, 50, 19.5]}>
        <circleGeometry args={[20, 32]} />
        <meshBasicMaterial color="#ffffe0" transparent opacity={0.1} />
      </mesh>
    </>
  );
}