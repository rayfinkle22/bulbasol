import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// Seeded random for deterministic generation
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// Realistic tree with detailed trunk and layered foliage
export function RealisticTree({ position, scale = 1, variant = 0 }: { 
  position: [number, number, number]; 
  scale?: number;
  variant?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Subtle wind sway
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5 + variant) * 0.02;
    }
  });

  const isPine = variant % 3 === 0;
  const isOak = variant % 3 === 1;
  
  return (
    <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
      {/* Main trunk */}
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.12, 0.22, 3, 8]} />
        <meshStandardMaterial color="#3d2817" roughness={0.95} />
      </mesh>
      
      {/* Root flares */}
      {[0, 1, 2, 3].map((i) => (
        <mesh 
          key={`root-${i}`} 
          position={[Math.sin(i * 1.57) * 0.18, 0.1, Math.cos(i * 1.57) * 0.18]} 
          rotation={[0.3, i * 1.57, 0]}
          castShadow
        >
          <capsuleGeometry args={[0.05, 0.25, 4, 6]} />
          <meshStandardMaterial color="#3d2817" roughness={0.9} />
        </mesh>
      ))}
      
      {isPine && (
        <>
          {[2.2, 3.0, 3.7, 4.3].map((y, i) => (
            <mesh key={i} position={[0, y, 0]} castShadow receiveShadow>
              <coneGeometry args={[1.4 - i * 0.3, 1.2 - i * 0.15, 8]} />
              <meshStandardMaterial color={`hsl(120, ${45 + i * 5}%, ${22 + i * 4}%)`} roughness={0.85} />
            </mesh>
          ))}
        </>
      )}
      
      {isOak && (
        <group position={[0, 3.5, 0]}>
          <mesh castShadow receiveShadow>
            <icosahedronGeometry args={[1.8, 1]} />
            <meshStandardMaterial color="#2a6a22" roughness={0.9} />
          </mesh>
          {[0, 2, 4].map((angle, i) => (
            <mesh key={i} position={[Math.sin(angle) * 1.2, (i % 2) * 0.3, Math.cos(angle) * 1.2]} castShadow>
              <icosahedronGeometry args={[0.8, 1]} />
              <meshStandardMaterial color={`hsl(115, ${55 + i * 3}%, ${26 + i * 2}%)`} roughness={0.85} />
            </mesh>
          ))}
        </group>
      )}
      
      {!isPine && !isOak && (
        <>
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.18, 3, 8]} />
            <meshStandardMaterial color="#e8e0d5" roughness={0.7} />
          </mesh>
          <group position={[0, 3.2, 0]}>
            <mesh castShadow receiveShadow>
              <icosahedronGeometry args={[1.4, 1]} />
              <meshStandardMaterial color="#4a9a3a" roughness={0.85} />
            </mesh>
          </group>
        </>
      )}
    </group>
  );
}

// Detailed realistic rock with sharp edges and surface variation
export function RealisticRock({ position, scale = 1, variant = 0 }: {
  position: [number, number, number];
  scale?: number;
  variant?: number;
}) {
  const isMossy = variant % 3 === 0;
  const rockType = variant % 4;
  
  // Different rock colors for variety
  const rockColors = ['#6a6560', '#7a7570', '#5a5550', '#858075'];
  const baseColor = rockColors[rockType];
  
  return (
    <group position={position}>
      {/* Main rock body - using icosahedron for sharper edges */}
      <mesh 
        rotation={[seededRandom(variant) * 0.5, seededRandom(variant + 1) * Math.PI, seededRandom(variant + 2) * 0.3]}
        castShadow
        receiveShadow
      >
        <icosahedronGeometry args={[scale * 0.5, 0]} />
        <meshStandardMaterial 
          color={baseColor} 
          roughness={0.85}
          metalness={0.05}
          flatShading={true}
        />
      </mesh>
      
      {/* Secondary smaller rock attached */}
      <mesh 
        position={[scale * 0.3, -scale * 0.15, scale * 0.2]}
        rotation={[seededRandom(variant + 3) * 0.8, seededRandom(variant + 4) * Math.PI, 0]}
        castShadow
      >
        <icosahedronGeometry args={[scale * 0.25, 0]} />
        <meshStandardMaterial 
          color={rockColors[(rockType + 1) % 4]} 
          roughness={0.9}
          flatShading={true}
        />
      </mesh>
      
      {/* Tertiary detail rock */}
      <mesh 
        position={[-scale * 0.25, -scale * 0.2, -scale * 0.15]}
        rotation={[seededRandom(variant + 5) * 0.6, seededRandom(variant + 6) * Math.PI, 0]}
        castShadow
      >
        <octahedronGeometry args={[scale * 0.18, 0]} />
        <meshStandardMaterial 
          color={rockColors[(rockType + 2) % 4]} 
          roughness={0.95}
          flatShading={true}
        />
      </mesh>
      
      {/* Surface cracks/details using thin boxes */}
      <mesh 
        position={[0, scale * 0.2, scale * 0.15]}
        rotation={[0.3, 0.5, 0.2]}
      >
        <boxGeometry args={[scale * 0.4, 0.02, 0.03]} />
        <meshStandardMaterial color="#3a3530" roughness={1} />
      </mesh>
      
      {/* Moss patch on top if mossy */}
      {isMossy && (
        <mesh position={[0, scale * 0.35, 0]} scale={[0.8, 0.2, 0.8]}>
          <sphereGeometry args={[scale * 0.3, 6, 4]} />
          <meshStandardMaterial color="#4a7a40" roughness={1} />
        </mesh>
      )}
    </group>
  );
}

// Large boulder cluster for terrain
export function Boulder({ position, scale = 1, variant = 0 }: {
  position: [number, number, number];
  scale?: number;
  variant?: number;
}) {
  return (
    <group position={position}>
      {/* Main boulder - sharp geometric */}
      <mesh 
        rotation={[seededRandom(variant) * 0.3, seededRandom(variant + 1) * Math.PI, 0]}
        castShadow
        receiveShadow
      >
        <icosahedronGeometry args={[scale, 1]} />
        <meshStandardMaterial 
          color="#7a7570" 
          roughness={0.8}
          metalness={0.1}
          flatShading={true}
        />
      </mesh>
      
      {/* Surface detail - sharp edges */}
      <mesh 
        position={[scale * 0.4, scale * 0.3, scale * 0.2]}
        rotation={[0.5, 1.2, 0.3]}
        castShadow
      >
        <octahedronGeometry args={[scale * 0.35, 0]} />
        <meshStandardMaterial 
          color="#8a8580" 
          roughness={0.85}
          flatShading={true}
        />
      </mesh>
      
      {/* Smaller attached rocks */}
      <mesh position={[scale * 0.7, -scale * 0.3, scale * 0.4]} castShadow>
        <icosahedronGeometry args={[scale * 0.4, 0]} />
        <meshStandardMaterial color="#6a6560" roughness={0.9} flatShading={true} />
      </mesh>
      <mesh position={[-scale * 0.6, -scale * 0.35, -scale * 0.3]} castShadow>
        <octahedronGeometry args={[scale * 0.35, 0]} />
        <meshStandardMaterial color="#9a9590" roughness={0.85} flatShading={true} />
      </mesh>
      
      {/* Crack lines */}
      <mesh position={[0, scale * 0.5, 0]} rotation={[0.2, 0.8, 0.1]}>
        <boxGeometry args={[scale * 0.8, 0.02, 0.02]} />
        <meshStandardMaterial color="#4a4540" roughness={1} />
      </mesh>
    </group>
  );
}

// Hill/mound for terrain elevation
export function Hill({ position, scale = 1, variant = 0 }: {
  position: [number, number, number];
  scale?: number;
  variant?: number;
}) {
  const stretch = 1 + seededRandom(variant) * 0.5;
  
  return (
    <group position={position}>
      <mesh scale={[scale * stretch, scale * 0.4, scale]} receiveShadow castShadow>
        <sphereGeometry args={[1, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#5a8a45" roughness={0.9} />
      </mesh>
      <mesh position={[0, scale * 0.01, 0]} scale={[scale * stretch * 0.95, scale * 0.42, scale * 0.95]}>
        <sphereGeometry args={[1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#6a9a55" roughness={0.95} />
      </mesh>
    </group>
  );
}

// Grass clump - optimized
export function GrassClump({ position, seed }: { position: [number, number, number]; seed: number }) {
  const bladeCount = 6;
  
  return (
    <group position={position}>
      {Array.from({ length: bladeCount }).map((_, i) => {
        const angle = (i / bladeCount) * Math.PI * 2 + seededRandom(seed + i) * 0.5;
        const height = 0.12 + seededRandom(seed + i + 100) * 0.15;
        const lean = seededRandom(seed + i + 200) * 0.35;
        
        return (
          <mesh 
            key={i}
            position={[Math.sin(angle) * 0.05, height * 0.5, Math.cos(angle) * 0.05]}
            rotation={[lean, angle, lean * 0.5]}
          >
            <planeGeometry args={[0.03, height]} />
            <meshStandardMaterial 
              color={`hsl(95, ${55 + seededRandom(seed + i) * 15}%, ${32 + seededRandom(seed + i + 50) * 15}%)`}
              side={THREE.DoubleSide}
              roughness={0.9}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// Fern plant - optimized
export function Fern({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[0, 0.15, 0]} rotation={[0.6, angle, 0]}>
            <planeGeometry args={[0.12, 0.4]} />
            <meshStandardMaterial color="#4a8a3a" side={THREE.DoubleSide} roughness={0.85} />
          </mesh>
        );
      })}
    </group>
  );
}

// Fallen log - optimized
export function FallenLog({ position, rotation = 0, length = 3 }: {
  position: [number, number, number];
  rotation?: number;
  length?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.22, length, 8]} />
        <meshStandardMaterial color="#4a3820" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.16, 0]} scale={[0.4, 0.12, 0.25]}>
        <sphereGeometry args={[0.5, 6, 4]} />
        <meshStandardMaterial color="#5a8a4a" roughness={1} />
      </mesh>
    </group>
  );
}

// Wildflower patch - optimized
export function FlowerPatch({ position, variant = 0 }: {
  position: [number, number, number];
  variant?: number;
}) {
  const colors = ['#ff6b6b', '#ffd93d', '#6bcbff', '#ff9ff3', '#ffffff'];
  const flowerColor = colors[variant % colors.length];
  
  return (
    <group position={position}>
      {[0, 1, 2].map((i) => {
        const angle = (i / 3) * Math.PI * 2;
        const dist = 0.08 + seededRandom(variant + i) * 0.1;
        const height = 0.12 + seededRandom(variant + i + 20) * 0.08;
        
        return (
          <group key={i} position={[Math.sin(angle) * dist, 0, Math.cos(angle) * dist]}>
            <mesh position={[0, height / 2, 0]}>
              <cylinderGeometry args={[0.006, 0.008, height, 4]} />
              <meshStandardMaterial color="#3a6a2a" roughness={0.9} />
            </mesh>
            <mesh position={[0, height + 0.015, 0]}>
              <sphereGeometry args={[0.025, 6, 4]} />
              <meshStandardMaterial color={flowerColor} roughness={0.6} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// Main forest ground - optimized for performance
export function RealisticForestGround() {
  const forestElements = useMemo(() => {
    const trees: Array<{ x: number; z: number; scale: number; variant: number; key: number }> = [];
    const rocks: Array<{ x: number; z: number; scale: number; variant: number; key: number }> = [];
    const boulders: Array<{ x: number; z: number; scale: number; variant: number; key: number }> = [];
    const hills: Array<{ x: number; z: number; scale: number; variant: number; key: number }> = [];
    const grass: Array<{ x: number; z: number; seed: number; key: number }> = [];
    const ferns: Array<{ x: number; z: number; scale: number; key: number }> = [];
    const logs: Array<{ x: number; z: number; rotation: number; length: number; key: number }> = [];
    const flowers: Array<{ x: number; z: number; variant: number; key: number }> = [];
    
    // Trees around perimeter - reduced count for performance
    for (let i = 0; i < 50; i++) {
      const seed = i * 1.618;
      const angle = seededRandom(seed) * Math.PI * 2;
      const distance = 16 + seededRandom(seed + 1) * 15;
      trees.push({
        x: Math.sin(angle) * distance,
        z: Math.cos(angle) * distance,
        scale: 0.7 + seededRandom(seed + 2) * 0.7,
        variant: i,
        key: i
      });
    }
    
    // Hills
    for (let i = 0; i < 8; i++) {
      const seed = i * 7.89;
      const angle = seededRandom(seed) * Math.PI * 2;
      const dist = 10 + seededRandom(seed + 1) * 12;
      hills.push({
        x: Math.sin(angle) * dist,
        z: Math.cos(angle) * dist,
        scale: 2 + seededRandom(seed + 2) * 2.5,
        variant: i,
        key: i
      });
    }
    
    // Boulders
    for (let i = 0; i < 10; i++) {
      const seed = i * 5.67;
      const x = (seededRandom(seed) - 0.5) * 30;
      const z = (seededRandom(seed + 1) - 0.5) * 30;
      const dist = Math.sqrt(x * x + z * z);
      if (dist > 5) {
        boulders.push({
          x, z,
          scale: 0.6 + seededRandom(seed + 2) * 0.8,
          variant: i,
          key: i
        });
      }
    }
    
    // Rocks - more detailed now
    for (let i = 0; i < 30; i++) {
      const seed = i * 3.14159;
      const x = (seededRandom(seed) - 0.5) * 35;
      const z = (seededRandom(seed + 1) - 0.5) * 35;
      rocks.push({
        x, z,
        scale: 0.25 + seededRandom(seed + 2) * 0.5,
        variant: i,
        key: i
      });
    }
    
    // Grass - reduced for performance
    for (let i = 0; i < 200; i++) {
      const seed = i * 1.414;
      grass.push({
        x: (seededRandom(seed) - 0.5) * 40,
        z: (seededRandom(seed + 0.5) - 0.5) * 40,
        seed,
        key: i
      });
    }
    
    // Ferns
    for (let i = 0; i < 25; i++) {
      const seed = i * 2.236;
      ferns.push({
        x: (seededRandom(seed) - 0.5) * 35,
        z: (seededRandom(seed + 1) - 0.5) * 35,
        scale: 0.5 + seededRandom(seed + 2) * 0.4,
        key: i
      });
    }
    
    // Logs
    for (let i = 0; i < 6; i++) {
      const seed = i * 4.567;
      const x = (seededRandom(seed) - 0.5) * 30;
      const z = (seededRandom(seed + 1) - 0.5) * 30;
      if (Math.sqrt(x * x + z * z) > 6) {
        logs.push({
          x, z,
          rotation: seededRandom(seed + 2) * Math.PI,
          length: 1.5 + seededRandom(seed + 3) * 1.5,
          key: i
        });
      }
    }
    
    // Flowers
    for (let i = 0; i < 20; i++) {
      const seed = i * 3.33;
      flowers.push({
        x: (seededRandom(seed) - 0.5) * 25,
        z: (seededRandom(seed + 1) - 0.5) * 25,
        variant: i,
        key: i
      });
    }
    
    return { trees, rocks, boulders, hills, grass, ferns, logs, flowers };
  }, []);

  return (
    <>
      {/* Base ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#3a3528" roughness={1} />
      </mesh>
      
      {/* Grass meadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[18, 32]} />
        <meshStandardMaterial color="#5a8a45" roughness={0.9} />
      </mesh>
      
      {/* Center clearing */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[10, 24]} />
        <meshStandardMaterial color="#6a9a52" roughness={0.85} />
      </mesh>
      
      {/* Hills */}
      {forestElements.hills.map((hill) => (
        <Hill key={`hill-${hill.key}`} position={[hill.x, 0, hill.z]} scale={hill.scale} variant={hill.variant} />
      ))}
      
      {/* Trees */}
      {forestElements.trees.map((tree) => (
        <RealisticTree key={tree.key} position={[tree.x, 0, tree.z]} scale={tree.scale} variant={tree.variant} />
      ))}
      
      {/* Boulders */}
      {forestElements.boulders.map((boulder) => (
        <Boulder key={`boulder-${boulder.key}`} position={[boulder.x, boulder.scale * 0.3, boulder.z]} scale={boulder.scale} variant={boulder.variant} />
      ))}
      
      {/* Rocks */}
      {forestElements.rocks.map((rock) => (
        <RealisticRock key={rock.key} position={[rock.x, 0.1, rock.z]} scale={rock.scale} variant={rock.variant} />
      ))}
      
      {/* Grass */}
      {forestElements.grass.map((g) => (
        <GrassClump key={g.key} position={[g.x, 0, g.z]} seed={g.seed} />
      ))}
      
      {/* Ferns */}
      {forestElements.ferns.map((fern) => (
        <Fern key={fern.key} position={[fern.x, 0, fern.z]} scale={fern.scale} />
      ))}
      
      {/* Logs */}
      {forestElements.logs.map((log) => (
        <FallenLog key={log.key} position={[log.x, 0.12, log.z]} rotation={log.rotation} length={log.length} />
      ))}
      
      {/* Flowers */}
      {forestElements.flowers.map((flower) => (
        <FlowerPatch key={`flower-${flower.key}`} position={[flower.x, 0, flower.z]} variant={flower.variant} />
      ))}
    </>
  );
}