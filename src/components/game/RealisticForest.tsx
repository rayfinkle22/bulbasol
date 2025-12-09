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
      {/* Main trunk with bark texture simulation */}
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.12, 0.22, 3, 12]} />
        <meshStandardMaterial 
          color="#3d2817" 
          roughness={0.95} 
          metalness={0}
        />
      </mesh>
      
      {/* Trunk detail rings */}
      {[0.4, 0.9, 1.4, 1.9].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} castShadow>
          <torusGeometry args={[0.17 - i * 0.015, 0.02, 8, 16]} />
          <meshStandardMaterial color="#2a1a0f" roughness={1} />
        </mesh>
      ))}
      
      {/* Root flares */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh 
          key={`root-${i}`} 
          position={[
            Math.sin(i * 1.256) * 0.18, 
            0.1, 
            Math.cos(i * 1.256) * 0.18
          ]} 
          rotation={[0.3, i * 1.256, 0]}
          castShadow
        >
          <capsuleGeometry args={[0.05, 0.25, 4, 8]} />
          <meshStandardMaterial color="#3d2817" roughness={0.9} />
        </mesh>
      ))}
      
      {isPine && (
        <>
          {/* Pine tree foliage - stacked cones with depth */}
          {[2.2, 3.0, 3.7, 4.3, 4.8].map((y, i) => (
            <group key={i}>
              <mesh position={[0, y, 0]} castShadow receiveShadow>
                <coneGeometry args={[1.4 - i * 0.25, 1.2 - i * 0.15, 12]} />
                <meshStandardMaterial 
                  color={`hsl(120, ${45 + i * 5}%, ${22 + i * 4}%)`}
                  roughness={0.85}
                  metalness={0}
                />
              </mesh>
              {/* Branch detail */}
              <mesh position={[0, y - 0.1, 0]} castShadow>
                <coneGeometry args={[1.35 - i * 0.25, 0.15, 12]} />
                <meshStandardMaterial color="#1a4015" roughness={0.9} />
              </mesh>
            </group>
          ))}
        </>
      )}
      
      {isOak && (
        <>
          {/* Oak tree - rounded canopy clusters */}
          <group position={[0, 3.5, 0]}>
            {/* Main canopy sphere */}
            <mesh castShadow receiveShadow>
              <icosahedronGeometry args={[1.8, 2]} />
              <meshStandardMaterial color="#2a6a22" roughness={0.9} />
            </mesh>
            {/* Canopy detail clusters */}
            {[0, 1.2, 2.4, 3.6, 4.8, 6].map((angle, i) => (
              <mesh 
                key={i} 
                position={[
                  Math.sin(angle) * 1.2, 
                  (i % 2) * 0.4 - 0.2, 
                  Math.cos(angle) * 1.2
                ]}
                castShadow
              >
                <icosahedronGeometry args={[0.9 + seededRandom(i + variant) * 0.3, 1]} />
                <meshStandardMaterial 
                  color={`hsl(115, ${55 + i * 3}%, ${26 + i * 2}%)`} 
                  roughness={0.85} 
                />
              </mesh>
            ))}
          </group>
          {/* Lower branches */}
          {[0, 2, 4].map((i) => (
            <mesh 
              key={`branch-${i}`}
              position={[Math.sin(i) * 0.5, 2.2, Math.cos(i) * 0.5]}
              rotation={[0.4, i, 0.3]}
              castShadow
            >
              <capsuleGeometry args={[0.04, 0.8, 4, 8]} />
              <meshStandardMaterial color="#3d2817" roughness={0.9} />
            </mesh>
          ))}
        </>
      )}
      
      {!isPine && !isOak && (
        <>
          {/* Birch/mixed tree */}
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.18, 3, 10]} />
            <meshStandardMaterial color="#e8e0d5" roughness={0.7} />
          </mesh>
          {/* Birch bark marks */}
          {[0.5, 1.2, 1.8, 2.4].map((y, i) => (
            <mesh key={i} position={[0.09 * ((i % 2) * 2 - 1), y, 0.05]} rotation={[0, i * 0.5, 0]}>
              <boxGeometry args={[0.08, 0.06, 0.02]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
            </mesh>
          ))}
          <group position={[0, 3.2, 0]}>
            <mesh castShadow receiveShadow>
              <icosahedronGeometry args={[1.4, 1]} />
              <meshStandardMaterial color="#4a9a3a" roughness={0.85} />
            </mesh>
            <mesh position={[0.6, 0.3, 0.4]} castShadow>
              <icosahedronGeometry args={[0.7, 1]} />
              <meshStandardMaterial color="#5aaa4a" roughness={0.8} />
            </mesh>
            <mesh position={[-0.5, -0.2, 0.5]} castShadow>
              <icosahedronGeometry args={[0.6, 1]} />
              <meshStandardMaterial color="#3a8a2a" roughness={0.85} />
            </mesh>
          </group>
        </>
      )}
    </group>
  );
}

// Detailed rock with realistic geometry
export function RealisticRock({ position, scale = 1, variant = 0 }: {
  position: [number, number, number];
  scale?: number;
  variant?: number;
}) {
  const isMossy = variant % 3 === 0;
  
  return (
    <group position={position}>
      <mesh 
        rotation={[seededRandom(variant) * 0.5, seededRandom(variant + 1) * Math.PI, seededRandom(variant + 2) * 0.3]}
        castShadow
        receiveShadow
      >
        <dodecahedronGeometry args={[scale * 0.5, 1]} />
        <meshStandardMaterial 
          color={isMossy ? "#6a7a6a" : "#7a7875"} 
          roughness={0.95}
          metalness={0}
        />
      </mesh>
      {isMossy && (
        <mesh position={[0, scale * 0.25, 0]} scale={[1.05, 0.3, 1.05]}>
          <sphereGeometry args={[scale * 0.35, 8, 6]} />
          <meshStandardMaterial color="#4a7a40" roughness={1} transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}

// Large boulder for terrain variety
export function Boulder({ position, scale = 1, variant = 0 }: {
  position: [number, number, number];
  scale?: number;
  variant?: number;
}) {
  return (
    <group position={position}>
      {/* Main boulder */}
      <mesh 
        rotation={[seededRandom(variant) * 0.3, seededRandom(variant + 1) * Math.PI, 0]}
        castShadow
        receiveShadow
      >
        <dodecahedronGeometry args={[scale, 2]} />
        <meshStandardMaterial 
          color="#8a8580" 
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      {/* Smaller attached rocks */}
      <mesh position={[scale * 0.6, -scale * 0.2, scale * 0.3]} castShadow>
        <dodecahedronGeometry args={[scale * 0.4, 1]} />
        <meshStandardMaterial color="#7a7570" roughness={0.95} />
      </mesh>
      <mesh position={[-scale * 0.5, -scale * 0.3, -scale * 0.2]} castShadow>
        <dodecahedronGeometry args={[scale * 0.35, 1]} />
        <meshStandardMaterial color="#9a9590" roughness={0.9} />
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
      {/* Main hill body */}
      <mesh scale={[scale * stretch, scale * 0.4, scale]} receiveShadow castShadow>
        <sphereGeometry args={[1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#5a8a45" roughness={0.9} />
      </mesh>
      {/* Grass texture overlay */}
      <mesh 
        position={[0, scale * 0.01, 0]} 
        scale={[scale * stretch * 0.95, scale * 0.42, scale * 0.95]}
      >
        <sphereGeometry args={[1, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#6a9a55" roughness={0.95} />
      </mesh>
      {/* Rocky patches */}
      {variant % 2 === 0 && (
        <mesh position={[scale * 0.3, scale * 0.15, scale * 0.2]} castShadow>
          <dodecahedronGeometry args={[scale * 0.15, 1]} />
          <meshStandardMaterial color="#8a8580" roughness={0.95} />
        </mesh>
      )}
    </group>
  );
}

// Detailed grass clump
export function GrassClump({ position, seed }: { position: [number, number, number]; seed: number }) {
  const bladeCount = 8 + Math.floor(seededRandom(seed) * 6);
  
  return (
    <group position={position}>
      {Array.from({ length: bladeCount }).map((_, i) => {
        const angle = (i / bladeCount) * Math.PI * 2 + seededRandom(seed + i) * 0.5;
        const height = 0.15 + seededRandom(seed + i + 100) * 0.2;
        const lean = seededRandom(seed + i + 200) * 0.4;
        const dist = seededRandom(seed + i + 300) * 0.08;
        
        return (
          <mesh 
            key={i}
            position={[Math.sin(angle) * dist, height * 0.5, Math.cos(angle) * dist]}
            rotation={[lean, angle, lean * 0.5]}
          >
            <planeGeometry args={[0.04, height]} />
            <meshStandardMaterial 
              color={`hsl(95, ${55 + seededRandom(seed + i) * 20}%, ${32 + seededRandom(seed + i + 50) * 18}%)`}
              side={THREE.DoubleSide}
              roughness={0.9}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// Fern plant
export function Fern({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2;
        return (
          <group key={i} rotation={[0.6, angle, 0]}>
            {/* Fern frond */}
            <mesh position={[0, 0.2, 0.3]}>
              <planeGeometry args={[0.15, 0.5]} />
              <meshStandardMaterial color="#4a8a3a" side={THREE.DoubleSide} roughness={0.85} />
            </mesh>
            {/* Leaflets */}
            {[0.1, 0.2, 0.3, 0.4].map((y, j) => (
              <mesh key={j} position={[(j % 2 === 0 ? 0.06 : -0.06), y, 0.3]} rotation={[0, 0, (j % 2 === 0 ? 0.4 : -0.4)]}>
                <planeGeometry args={[0.08, 0.06]} />
                <meshStandardMaterial color="#5a9a4a" side={THREE.DoubleSide} roughness={0.85} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

// Fallen log
export function FallenLog({ position, rotation = 0, length = 3 }: {
  position: [number, number, number];
  rotation?: number;
  length?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.25, length, 12]} />
        <meshStandardMaterial color="#4a3820" roughness={0.95} />
      </mesh>
      {/* Moss patches */}
      {[0, 0.5, 1].map((offset, i) => (
        <mesh key={i} position={[offset - 0.5, 0.18, 0]} scale={[0.3, 0.1, 0.2]}>
          <sphereGeometry args={[0.5, 6, 4]} />
          <meshStandardMaterial color="#5a8a4a" roughness={1} />
        </mesh>
      ))}
      {/* Mushrooms on log */}
      <mesh position={[0.3, 0.22, 0.1]}>
        <cylinderGeometry args={[0.06, 0.04, 0.06, 8]} />
        <meshStandardMaterial color="#c4a882" roughness={0.8} />
      </mesh>
      <mesh position={[0.3, 0.27, 0.1]}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial color="#d4b892" roughness={0.7} />
      </mesh>
    </group>
  );
}

// Wildflower patch
export function FlowerPatch({ position, variant = 0 }: {
  position: [number, number, number];
  variant?: number;
}) {
  const colors = ['#ff6b6b', '#ffd93d', '#6bcbff', '#ff9ff3', '#ffffff'];
  const flowerColor = colors[variant % colors.length];
  
  return (
    <group position={position}>
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2 + seededRandom(variant + i) * 0.5;
        const dist = 0.1 + seededRandom(variant + i + 10) * 0.15;
        const height = 0.15 + seededRandom(variant + i + 20) * 0.1;
        
        return (
          <group key={i} position={[Math.sin(angle) * dist, 0, Math.cos(angle) * dist]}>
            {/* Stem */}
            <mesh position={[0, height / 2, 0]}>
              <cylinderGeometry args={[0.008, 0.01, height, 6]} />
              <meshStandardMaterial color="#3a6a2a" roughness={0.9} />
            </mesh>
            {/* Flower head */}
            <mesh position={[0, height + 0.02, 0]}>
              <sphereGeometry args={[0.03, 8, 6]} />
              <meshStandardMaterial color={flowerColor} roughness={0.6} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// Main realistic forest ground component
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
    
    // Generate dense tree ring around play area
    for (let i = 0; i < 80; i++) {
      const seed = i * 1.618;
      const angle = seededRandom(seed) * Math.PI * 2;
      const distance = 16 + seededRandom(seed + 1) * 18;
      trees.push({
        x: Math.sin(angle) * distance,
        z: Math.cos(angle) * distance,
        scale: 0.7 + seededRandom(seed + 2) * 0.8,
        variant: i,
        key: i
      });
    }
    
    // Scattered trees
    for (let i = 80; i < 120; i++) {
      const seed = i * 2.718;
      const x = (seededRandom(seed) - 0.5) * 60;
      const z = (seededRandom(seed + 1) - 0.5) * 60;
      const dist = Math.sqrt(x * x + z * z);
      if (dist > 14 && dist < 35) {
        trees.push({
          x, z,
          scale: 0.5 + seededRandom(seed + 2) * 1,
          variant: i,
          key: i
        });
      }
    }
    
    // Hills scattered around the play area
    for (let i = 0; i < 12; i++) {
      const seed = i * 7.89;
      const angle = seededRandom(seed) * Math.PI * 2;
      const dist = 8 + seededRandom(seed + 1) * 15;
      hills.push({
        x: Math.sin(angle) * dist,
        z: Math.cos(angle) * dist,
        scale: 2 + seededRandom(seed + 2) * 3,
        variant: i,
        key: i
      });
    }
    
    // Large boulders
    for (let i = 0; i < 15; i++) {
      const seed = i * 5.67;
      const x = (seededRandom(seed) - 0.5) * 35;
      const z = (seededRandom(seed + 1) - 0.5) * 35;
      const dist = Math.sqrt(x * x + z * z);
      if (dist > 6) {
        boulders.push({
          x, z,
          scale: 0.8 + seededRandom(seed + 2) * 1.2,
          variant: i,
          key: i
        });
      }
    }
    
    // Small rocks
    for (let i = 0; i < 45; i++) {
      const seed = i * 3.14159;
      const x = (seededRandom(seed) - 0.5) * 40;
      const z = (seededRandom(seed + 1) - 0.5) * 40;
      rocks.push({
        x, z,
        scale: 0.3 + seededRandom(seed + 2) * 0.8,
        variant: i,
        key: i
      });
    }
    
    // Dense grass
    for (let i = 0; i < 400; i++) {
      const seed = i * 1.414;
      grass.push({
        x: (seededRandom(seed) - 0.5) * 50,
        z: (seededRandom(seed + 0.5) - 0.5) * 50,
        seed,
        key: i
      });
    }
    
    // Ferns scattered
    for (let i = 0; i < 50; i++) {
      const seed = i * 2.236;
      ferns.push({
        x: (seededRandom(seed) - 0.5) * 45,
        z: (seededRandom(seed + 1) - 0.5) * 45,
        scale: 0.6 + seededRandom(seed + 2) * 0.5,
        key: i
      });
    }
    
    // Fallen logs
    for (let i = 0; i < 10; i++) {
      const seed = i * 4.567;
      const x = (seededRandom(seed) - 0.5) * 35;
      const z = (seededRandom(seed + 1) - 0.5) * 35;
      if (Math.sqrt(x * x + z * z) > 8) {
        logs.push({
          x, z,
          rotation: seededRandom(seed + 2) * Math.PI,
          length: 2 + seededRandom(seed + 3) * 2,
          key: i
        });
      }
    }
    
    // Wildflowers in sunny patches
    for (let i = 0; i < 30; i++) {
      const seed = i * 3.33;
      const x = (seededRandom(seed) - 0.5) * 30;
      const z = (seededRandom(seed + 1) - 0.5) * 30;
      flowers.push({
        x, z,
        variant: i,
        key: i
      });
    }
    
    return { trees, rocks, boulders, hills, grass, ferns, logs, flowers };
  }, []);

  return (
    <>
      {/* Multi-layered terrain */}
      {/* Base dark soil */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#3a3528" roughness={1} />
      </mesh>
      
      {/* Forest floor - leaf litter texture simulation */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[45, 64]} />
        <meshStandardMaterial 
          color="#4a4535" 
          roughness={0.95}
        />
      </mesh>
      
      {/* Grass meadow area - brighter for sunny day */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[20, 48]} />
        <meshStandardMaterial color="#5a8a45" roughness={0.9} />
      </mesh>
      
      {/* Central clearing with lush grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[12, 32]} />
        <meshStandardMaterial color="#6a9a52" roughness={0.85} />
      </mesh>
      
      {/* Dirt path texture */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]} receiveShadow>
        <ringGeometry args={[3, 6, 32]} />
        <meshStandardMaterial color="#6a5a45" roughness={0.95} />
      </mesh>
      
      {/* Hills */}
      {forestElements.hills.map((hill) => (
        <Hill 
          key={`hill-${hill.key}`} 
          position={[hill.x, 0, hill.z]} 
          scale={hill.scale}
          variant={hill.variant}
        />
      ))}
      
      {/* Trees */}
      {forestElements.trees.map((tree) => (
        <RealisticTree 
          key={tree.key} 
          position={[tree.x, 0, tree.z]} 
          scale={tree.scale}
          variant={tree.variant}
        />
      ))}
      
      {/* Boulders */}
      {forestElements.boulders.map((boulder) => (
        <Boulder 
          key={`boulder-${boulder.key}`} 
          position={[boulder.x, boulder.scale * 0.3, boulder.z]} 
          scale={boulder.scale}
          variant={boulder.variant}
        />
      ))}
      
      {/* Rocks */}
      {forestElements.rocks.map((rock) => (
        <RealisticRock 
          key={rock.key} 
          position={[rock.x, 0.1, rock.z]} 
          scale={rock.scale}
          variant={rock.variant}
        />
      ))}
      
      {/* Grass clumps */}
      {forestElements.grass.map((g) => (
        <GrassClump key={g.key} position={[g.x, 0, g.z]} seed={g.seed} />
      ))}
      
      {/* Ferns */}
      {forestElements.ferns.map((fern) => (
        <Fern key={fern.key} position={[fern.x, 0, fern.z]} scale={fern.scale} />
      ))}
      
      {/* Fallen logs */}
      {forestElements.logs.map((log) => (
        <FallenLog 
          key={log.key} 
          position={[log.x, 0.15, log.z]} 
          rotation={log.rotation}
          length={log.length}
        />
      ))}
      
      {/* Wildflowers */}
      {forestElements.flowers.map((flower) => (
        <FlowerPatch 
          key={`flower-${flower.key}`} 
          position={[flower.x, 0, flower.z]} 
          variant={flower.variant}
        />
      ))}
    </>
  );
}