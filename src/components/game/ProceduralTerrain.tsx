import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// Seeded random for deterministic generation
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// Noise function for terrain height
const noise2D = (x: number, z: number, seed: number = 0): number => {
  const n = Math.sin(x * 0.1 + seed) * Math.cos(z * 0.1 + seed * 0.7) +
            Math.sin(x * 0.05 + z * 0.05) * 0.5 +
            Math.sin(x * 0.2) * Math.cos(z * 0.15) * 0.25;
  return n * 0.5 + 0.5;
};

// Stylized low-poly tree - minimal geometry for mobile
function StylizedTree({ position, scale = 1, variant = 0 }: { 
  position: [number, number, number]; 
  scale?: number;
  variant?: number;
}) {
  const isPine = variant % 3 === 0;
  const colors = ['#2d5a27', '#3a7a33', '#4a8a44', '#1d4a18'];
  const trunkColor = variant % 2 === 0 ? '#5a3d20' : '#4a2d15';
  
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Trunk */}
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.15, 2, 5]} />
        <meshStandardMaterial color={trunkColor} flatShading />
      </mesh>
      
      {isPine ? (
        // Pine tree - stacked cones
        <>
          <mesh position={[0, 2, 0]} castShadow>
            <coneGeometry args={[1.2, 1.5, 5]} />
            <meshStandardMaterial color={colors[variant % 4]} flatShading />
          </mesh>
          <mesh position={[0, 2.8, 0]} castShadow>
            <coneGeometry args={[0.9, 1.2, 5]} />
            <meshStandardMaterial color={colors[(variant + 1) % 4]} flatShading />
          </mesh>
          <mesh position={[0, 3.4, 0]} castShadow>
            <coneGeometry args={[0.5, 0.8, 5]} />
            <meshStandardMaterial color={colors[(variant + 2) % 4]} flatShading />
          </mesh>
        </>
      ) : (
        // Deciduous tree - simple sphere
        <mesh position={[0, 2.5, 0]} castShadow>
          <icosahedronGeometry args={[1.3, 1]} />
          <meshStandardMaterial color={colors[variant % 4]} flatShading />
        </mesh>
      )}
    </group>
  );
}

// Stylized rock - very low poly
function StylizedRock({ position, scale = 1, variant = 0 }: {
  position: [number, number, number];
  scale?: number;
  variant?: number;
}) {
  const colors = ['#6a6560', '#7a7570', '#5a5550', '#858075'];
  
  return (
    <mesh 
      position={position}
      rotation={[seededRandom(variant) * 0.5, variant * 0.8, 0]}
      castShadow
    >
      <icosahedronGeometry args={[scale * 0.5, 0]} />
      <meshStandardMaterial color={colors[variant % 4]} flatShading />
    </mesh>
  );
}

// Stylized bush - simple spheres
function StylizedBush({ position, scale = 1, variant = 0 }: {
  position: [number, number, number];
  scale?: number;
  variant?: number;
}) {
  const colors = ['#3a6a2a', '#4a7a3a', '#2a5a20', '#5a8a4a'];
  
  return (
    <group position={position}>
      <mesh castShadow>
        <icosahedronGeometry args={[scale * 0.4, 0]} />
        <meshStandardMaterial color={colors[variant % 4]} flatShading />
      </mesh>
      <mesh position={[scale * 0.25, -0.1, scale * 0.15]} castShadow>
        <icosahedronGeometry args={[scale * 0.3, 0]} />
        <meshStandardMaterial color={colors[(variant + 1) % 4]} flatShading />
      </mesh>
    </group>
  );
}

// Pond with animated water - static geometry
function Pond({ position, size = 3 }: { position: [number, number, number]; size?: number }) {
  const waterRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (waterRef.current) {
      const material = waterRef.current.material as THREE.MeshStandardMaterial;
      material.opacity = 0.7 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });
  
  return (
    <group position={position}>
      {/* Pond bed */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <circleGeometry args={[size, 16]} />
        <meshStandardMaterial color="#2a4a5a" />
      </mesh>
      {/* Water surface */}
      <mesh ref={waterRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[size * 0.95, 16]} />
        <meshStandardMaterial color="#4a8aaa" transparent opacity={0.7} />
      </mesh>
      {/* Shore rocks */}
      {[0, 1.5, 3, 4.5, 6].map((angle, i) => (
        <StylizedRock 
          key={i}
          position={[Math.sin(angle) * size, 0, Math.cos(angle) * size]}
          scale={0.3 + seededRandom(i) * 0.3}
          variant={i}
        />
      ))}
    </group>
  );
}

// Path/trail
function DirtPath({ points }: { points: [number, number, number][] }) {
  return (
    <group>
      {points.map((point, i) => (
        <mesh key={i} position={point} rotation={[-Math.PI / 2, 0, seededRandom(i) * Math.PI]}>
          <circleGeometry args={[1.5, 8]} />
          <meshStandardMaterial color="#6a5a45" />
        </mesh>
      ))}
    </group>
  );
}

// Mushroom cluster
function MushroomCluster({ position, variant = 0 }: { position: [number, number, number]; variant?: number }) {
  const colors = ['#cc4444', '#ffaa44', '#eeeeee', '#aa44aa'];
  
  return (
    <group position={position}>
      {[0, 1, 2].map((i) => {
        const offset = seededRandom(variant + i);
        const scale = 0.15 + offset * 0.15;
        return (
          <group key={i} position={[offset * 0.5 - 0.25, 0, (offset - 0.5) * 0.3]}>
            {/* Stem */}
            <mesh position={[0, scale * 0.5, 0]}>
              <cylinderGeometry args={[0.03, 0.05, scale, 4]} />
              <meshStandardMaterial color="#eeddcc" flatShading />
            </mesh>
            {/* Cap */}
            <mesh position={[0, scale + 0.05, 0]}>
              <coneGeometry args={[0.12, 0.08, 6]} />
              <meshStandardMaterial color={colors[(variant + i) % 4]} flatShading />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// Log obstacle
function FallenLog({ position, rotation = 0, length = 2 }: {
  position: [number, number, number];
  rotation?: number;
  length?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.2, 0.25, length, 8]} />
        <meshStandardMaterial color="#4a3520" flatShading />
      </mesh>
      {/* Moss */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[length * 0.6, 0.1, 0.3]} />
        <meshStandardMaterial color="#5a8a4a" flatShading />
      </mesh>
    </group>
  );
}

// Main terrain component - optimized for mobile
export function ProceduralTerrain({ isMobile = false }: { isMobile?: boolean }) {
  const elements = useMemo(() => {
    // Drastically reduce counts for mobile
    const treeCount = isMobile ? 12 : 45;
    const rockCount = isMobile ? 5 : 20;
    const bushCount = isMobile ? 4 : 15;
    const mushroomCount = isMobile ? 0 : 12;
    const logCount = isMobile ? 1 : 4;
    
    const trees: Array<{ x: number; z: number; y: number; scale: number; variant: number; key: number }> = [];
    const rocks: Array<{ x: number; z: number; y: number; scale: number; variant: number; key: number }> = [];
    const bushes: Array<{ x: number; z: number; y: number; scale: number; variant: number; key: number }> = [];
    const mushrooms: Array<{ x: number; z: number; y: number; variant: number; key: number }> = [];
    const logs: Array<{ x: number; z: number; y: number; rotation: number; length: number; key: number }> = [];
    
    // Create a winding path through the forest
    const pathPoints: [number, number, number][] = [];
    for (let i = 0; i < 12; i++) {
      const t = i / 12;
      const x = Math.sin(t * Math.PI * 2) * 8 + Math.sin(t * Math.PI * 4) * 3;
      const z = Math.cos(t * Math.PI * 2) * 8 + Math.cos(t * Math.PI * 3) * 2;
      pathPoints.push([x, 0.01, z]);
    }
    
    // Trees - around perimeter and scattered
    for (let i = 0; i < treeCount; i++) {
      const seed = i * 1.618;
      const angle = seededRandom(seed) * Math.PI * 2;
      const distance = i < treeCount * 0.6 ? 
        18 + seededRandom(seed + 1) * 12 : // Outer trees
        8 + seededRandom(seed + 1) * 8; // Some inner trees
      
      const x = Math.sin(angle) * distance;
      const z = Math.cos(angle) * distance;
      const distFromCenter = Math.sqrt(x * x + z * z);
      
      // Avoid center spawn area and path
      if (distFromCenter > 5) {
        const y = noise2D(x, z) * 0.3; // Slight height variation
        trees.push({
          x, z, y,
          scale: 0.7 + seededRandom(seed + 2) * 0.6,
          variant: i,
          key: i
        });
      }
    }
    
    // Rocks - scattered with clusters
    for (let i = 0; i < rockCount; i++) {
      const seed = i * 3.14;
      const x = (seededRandom(seed) - 0.5) * 35;
      const z = (seededRandom(seed + 1) - 0.5) * 35;
      const distFromCenter = Math.sqrt(x * x + z * z);
      
      if (distFromCenter > 4) {
        rocks.push({
          x, z,
          y: 0,
          scale: 0.4 + seededRandom(seed + 2) * 0.8,
          variant: i,
          key: i
        });
      }
    }
    
    // Bushes
    for (let i = 0; i < bushCount; i++) {
      const seed = i * 2.718;
      const x = (seededRandom(seed) - 0.5) * 30;
      const z = (seededRandom(seed + 1) - 0.5) * 30;
      const distFromCenter = Math.sqrt(x * x + z * z);
      
      if (distFromCenter > 6 && distFromCenter < 25) {
        bushes.push({
          x, z,
          y: 0.2,
          scale: 0.5 + seededRandom(seed + 2) * 0.5,
          variant: i,
          key: i
        });
      }
    }
    
    // Mushrooms - in shady areas
    for (let i = 0; i < mushroomCount; i++) {
      const seed = i * 4.567;
      const x = (seededRandom(seed) - 0.5) * 25;
      const z = (seededRandom(seed + 1) - 0.5) * 25;
      const distFromCenter = Math.sqrt(x * x + z * z);
      
      if (distFromCenter > 5 && distFromCenter < 20) {
        mushrooms.push({
          x, z,
          y: 0,
          variant: i,
          key: i
        });
      }
    }
    
    // Fallen logs
    for (let i = 0; i < logCount; i++) {
      const seed = i * 5.678;
      const x = (seededRandom(seed) - 0.5) * 28;
      const z = (seededRandom(seed + 1) - 0.5) * 28;
      const distFromCenter = Math.sqrt(x * x + z * z);
      
      if (distFromCenter > 6) {
        logs.push({
          x, z,
          y: 0.2,
          rotation: seededRandom(seed + 2) * Math.PI,
          length: 1.5 + seededRandom(seed + 3) * 2,
          key: i
        });
      }
    }
    
    return { trees, rocks, bushes, mushrooms, logs, pathPoints };
  }, [isMobile]);

  return (
    <>
      {/* Base terrain - rich earth tones */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#3a4a2a" />
      </mesh>
      
      {/* Outer forest floor - darker */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <ringGeometry args={[15, 40, 24]} />
        <meshStandardMaterial color="#2a3a1a" />
      </mesh>
      
      {/* Main play area - lush grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[16, 24]} />
        <meshStandardMaterial color="#4a7a3a" />
      </mesh>
      
      {/* Center clearing - lighter grass with gradient */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
        <circleGeometry args={[8, 20]} />
        <meshStandardMaterial color="#5a8a4a" />
      </mesh>
      
      {/* Spawn point - soft earth */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} receiveShadow>
        <circleGeometry args={[3, 12]} />
        <meshStandardMaterial color="#7a6a55" />
      </mesh>
      
      {/* Dirt path */}
      <DirtPath points={elements.pathPoints} />
      
      {/* Small pond */}
      <Pond position={[-10, 0, 8]} size={2.5} />
      
      {/* Trees */}
      {elements.trees.map((tree) => (
        <StylizedTree 
          key={`tree-${tree.key}`}
          position={[tree.x, tree.y, tree.z]}
          scale={tree.scale}
          variant={tree.variant}
        />
      ))}
      
      {/* Rocks */}
      {elements.rocks.map((rock) => (
        <StylizedRock 
          key={`rock-${rock.key}`}
          position={[rock.x, rock.y, rock.z]}
          scale={rock.scale}
          variant={rock.variant}
        />
      ))}
      
      {/* Bushes */}
      {elements.bushes.map((bush) => (
        <StylizedBush 
          key={`bush-${bush.key}`}
          position={[bush.x, bush.y, bush.z]}
          scale={bush.scale}
          variant={bush.variant}
        />
      ))}
      
      {/* Mushrooms */}
      {elements.mushrooms.map((mushroom) => (
        <MushroomCluster 
          key={`mushroom-${mushroom.key}`}
          position={[mushroom.x, mushroom.y, mushroom.z]}
          variant={mushroom.variant}
        />
      ))}
      
      {/* Fallen logs */}
      {elements.logs.map((log) => (
        <FallenLog 
          key={`log-${log.key}`}
          position={[log.x, log.y, log.z]}
          rotation={log.rotation}
          length={log.length}
        />
      ))}
      
      {/* Atmospheric fog circles at perimeter */}
      {!isMobile && [0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2;
        return (
          <mesh 
            key={`fog-${i}`}
            position={[Math.sin(angle) * 18, 0.5, Math.cos(angle) * 18]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[4, 8]} />
            <meshBasicMaterial color="#8a9a7a" transparent opacity={0.12} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </>
  );
}

export default ProceduralTerrain;
