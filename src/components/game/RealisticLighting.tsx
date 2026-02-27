import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useIsMobile } from '@/hooks/use-mobile';

export function RealisticLighting() {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const isMobile = useIsMobile();
  
  useFrame(() => {
    if (sunRef.current && !isMobile) {
      // Enable shadows only on desktop
      sunRef.current.castShadow = true;
      sunRef.current.shadow.mapSize.width = 1024;
      sunRef.current.shadow.mapSize.height = 1024;
      sunRef.current.shadow.camera.near = 0.5;
      sunRef.current.shadow.camera.far = 60;
      sunRef.current.shadow.camera.left = -20;
      sunRef.current.shadow.camera.right = 20;
      sunRef.current.shadow.camera.top = 20;
      sunRef.current.shadow.camera.bottom = -20;
      sunRef.current.shadow.bias = -0.0005;
    }
  });

  return (
    <>
      {/* Main sun — bright Pokemon-style noon light */}
      <directionalLight
        ref={sunRef}
        position={[20, 40, 15]}
        intensity={2.8}
        color="#ffffff"
        castShadow={!isMobile}
      />

      {/* Ambient fill — bright so terrain colors pop like Pokemon games */}
      <ambientLight intensity={0.75} color="#d4eeff" />

      {/* Hemisphere — bright blue sky / bright green ground bounce */}
      <hemisphereLight
        args={['#87d4ff', '#72c84a', 0.9]}
        position={[0, 50, 0]}
      />

      {/* Secondary fill lights - skip on mobile */}
      {!isMobile && (
        <>
          <directionalLight
            position={[-25, 30, -20]}
            intensity={0.5}
            color="#ffe8a0"
          />
          <directionalLight
            position={[-10, 25, 20]}
            intensity={0.4}
            color="#c8e8ff"
          />
          {/* Ground-level light to brighten grass */}
          <pointLight
            position={[0, 1.0, 0]}
            intensity={0.5}
            color="#88dd55"
            distance={30}
          />
        </>
      )}

      {/* Fog — lighter, more cheerful Pokemon-route color */}
      <fog attach="fog" args={['#b8e8c0', isMobile ? 40 : 30, isMobile ? 90 : 80]} />
    </>
  );
}

export function ForestSkybox() {
  const isMobile = useIsMobile();
  
  // Reduce skybox detail on mobile
  const treeCount = isMobile ? 8 : 24;
  const cloudCount = isMobile ? 4 : 12;
  const rayCount = isMobile ? 0 : 6;
  
  return (
    <>
      {/* Sky dome */}
      <mesh position={[0, 0, 0]} scale={[-1, 1, 1]}>
        <sphereGeometry args={[90, isMobile ? 16 : 64, isMobile ? 16 : 64]} />
        <meshBasicMaterial
          color="#5ab8ff"
          side={THREE.BackSide}
        />
      </mesh>
      
      {/* Horizon glow - skip on mobile */}
      {!isMobile && (
        <mesh position={[0, -25, 0]} scale={[-1, 1, 1]}>
          <sphereGeometry args={[89, 32, 32]} />
          <meshBasicMaterial 
            color="#b8e0f5" 
            side={THREE.BackSide}
            transparent
            opacity={0.7}
          />
        </mesh>
      )}
      
      {/* Distant forest silhouette */}
      {[...Array(treeCount)].map((_, i) => {
        const angle = (i / treeCount) * Math.PI * 2;
        const dist = 75;
        const height = 8 + Math.sin(i * 3.7) * 4;
        return (
          <mesh 
            key={`tree-sil-${i}`} 
            position={[Math.sin(angle) * dist, height / 2, Math.cos(angle) * dist]}
          >
            <coneGeometry args={[3 + Math.sin(i) * 1.5, height, isMobile ? 4 : 6]} />
            <meshBasicMaterial color="#2a4a3a" transparent opacity={0.6} />
          </mesh>
        );
      })}
      
      {/* Clouds */}
      {[...Array(cloudCount)].map((_, i) => {
        const angle = (i / cloudCount) * Math.PI * 2;
        const radius = 55 + Math.sin(i * 2.5) * 12;
        const y = 40 + Math.sin(i * 1.7) * 10;
        return (
          <group key={i} position={[Math.sin(angle) * radius, y, Math.cos(angle) * radius]}>
            <mesh scale={[14 + Math.sin(i) * 5, 3.5, 8 + Math.cos(i) * 3]}>
              <sphereGeometry args={[1, isMobile ? 6 : 12, isMobile ? 4 : 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            {!isMobile && (
              <>
                <mesh position={[6, 1, 2]} scale={[6, 3, 5]}>
                  <sphereGeometry args={[1, 10, 8]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
                <mesh position={[-5, 0.5, -1]} scale={[5, 2.5, 4]}>
                  <sphereGeometry args={[1, 10, 8]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
              </>
            )}
          </group>
        );
      })}
      
      {/* Sun */}
      <mesh position={[20, 40, 15]}>
        <circleGeometry args={[4, isMobile ? 16 : 32]} />
        <meshBasicMaterial color="#ffffd0" />
      </mesh>
      
      {/* Sun glow - simpler on mobile */}
      <mesh position={[20, 40, 14.9]}>
        <circleGeometry args={[10, isMobile ? 12 : 32]} />
        <meshBasicMaterial color="#ffffc0" transparent opacity={0.2} />
      </mesh>
      
      {/* Light rays - desktop only */}
      {[...Array(rayCount)].map((_, i) => {
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
