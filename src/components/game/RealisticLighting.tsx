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
      {/* Main sun - warm afternoon light filtering through trees */}
      <directionalLight
        ref={sunRef}
        position={[20, 40, 15]}
        intensity={2.2}
        color="#fff5e0"
        castShadow
      />
      
      {/* Ambient fill - cooler for forest shade */}
      <ambientLight intensity={0.4} color="#8ab4d8" />
      
      {/* Hemisphere light - sky blue above, forest green below */}
      <hemisphereLight
        args={['#87ceeb', '#4a6a3a', 0.7]}
        position={[0, 50, 0]}
      />
      
      {/* Secondary light for depth */}
      <directionalLight
        position={[-25, 30, -20]}
        intensity={0.4}
        color="#ffd8a0"
      />
      
      {/* Rim/back light */}
      <directionalLight
        position={[-10, 25, 20]}
        intensity={0.35}
        color="#c0d8ff"
      />
      
      {/* Ground bounce - green from grass */}
      <pointLight
        position={[0, 0.5, 0]}
        intensity={0.25}
        color="#6a9a4a"
        distance={25}
      />
      
      {/* Atmospheric forest fog */}
      <fog attach="fog" args={['#9ab8a0', 25, 70]} />
    </>
  );
}

export function ForestSkybox() {
  return (
    <>
      {/* Sky dome - gradient from deep blue to lighter horizon */}
      <mesh position={[0, 0, 0]} scale={[-1, 1, 1]}>
        <sphereGeometry args={[90, 64, 64]} />
        <meshBasicMaterial 
          color="#4a90d9" 
          side={THREE.BackSide}
        />
      </mesh>
      
      {/* Horizon glow */}
      <mesh position={[0, -25, 0]} scale={[-1, 1, 1]}>
        <sphereGeometry args={[89, 32, 32]} />
        <meshBasicMaterial 
          color="#b8e0f5" 
          side={THREE.BackSide}
          transparent
          opacity={0.7}
        />
      </mesh>
      
      {/* Distant forest silhouette */}
      {[...Array(24)].map((_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        const dist = 75;
        const height = 8 + Math.sin(i * 3.7) * 4;
        return (
          <mesh 
            key={`tree-sil-${i}`} 
            position={[Math.sin(angle) * dist, height / 2, Math.cos(angle) * dist]}
          >
            <coneGeometry args={[3 + Math.sin(i) * 1.5, height, 6]} />
            <meshBasicMaterial color="#2a4a3a" transparent opacity={0.6} />
          </mesh>
        );
      })}
      
      {/* Fluffy clouds */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 55 + Math.sin(i * 2.5) * 12;
        const y = 40 + Math.sin(i * 1.7) * 10;
        return (
          <group key={i} position={[Math.sin(angle) * radius, y, Math.cos(angle) * radius]}>
            <mesh scale={[14 + Math.sin(i) * 5, 3.5, 8 + Math.cos(i) * 3]}>
              <sphereGeometry args={[1, 12, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[6, 1, 2]} scale={[6, 3, 5]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[-5, 0.5, -1]} scale={[5, 2.5, 4]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        );
      })}
      
      {/* Sun */}
      <mesh position={[20, 40, 15]}>
        <circleGeometry args={[4, 32]} />
        <meshBasicMaterial color="#ffffd0" />
      </mesh>
      
      {/* Sun glow layers */}
      <mesh position={[20, 40, 14.9]}>
        <circleGeometry args={[10, 32]} />
        <meshBasicMaterial color="#ffffc0" transparent opacity={0.2} />
      </mesh>
      <mesh position={[20, 40, 14.8]}>
        <circleGeometry args={[18, 32]} />
        <meshBasicMaterial color="#ffffe8" transparent opacity={0.08} />
      </mesh>
      
      {/* Light rays/god rays effect */}
      {[...Array(6)].map((_, i) => {
        const angle = (i / 6) * Math.PI * 0.5 + 0.3;
        return (
          <mesh 
            key={`ray-${i}`}
            position={[20 + Math.sin(angle) * 25, 20, 15 + Math.cos(angle) * 25]}
            rotation={[Math.PI / 2, 0, angle]}
          >
            <planeGeometry args={[2, 40]} />
            <meshBasicMaterial 
              color="#ffffd0" 
              transparent 
              opacity={0.04} 
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        );
      })}
    </>
  );
}