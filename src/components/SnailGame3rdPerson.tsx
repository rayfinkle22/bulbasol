import { useState, useEffect, useCallback, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import * as THREE from "three";
import snailTexture from "@/assets/snail-game.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Bug {
  id: number;
  position: [number, number, number];
  velocity: [number, number];
  type: 'beetle' | 'centipede' | 'spider' | 'scorpion' | 'wasp';
  health: number;
  scale: number;
}

interface Bullet {
  id: number;
  position: [number, number, number];
  velocity: [number, number];
}

interface PowerUp {
  id: number;
  position: [number, number, number];
  type: 'health' | 'doubleDamage';
}

interface GameState {
  status: 'idle' | 'playing' | 'gameover' | 'entering_name';
  score: number;
  bugsKilled: number;
  snailPosition: [number, number];
  snailRotation: number;
  bugs: Bug[];
  bullets: Bullet[];
  powerUps: PowerUp[];
  health: number;
  doubleDamageUntil: number;
}

interface LeaderboardEntry {
  id?: string;
  name: string;
  score: number;
  created_at?: string;
}

type Difficulty = 'slow' | 'medium' | 'hard';

const SPEED_MULTIPLIERS: Record<Difficulty, number> = {
  slow: 0.3,
  medium: 0.6,
  hard: 1.0,
};

const BUG_CONFIGS = {
  beetle: { color: '#1a0a00', glowColor: '#ff3300', bodyScale: 1 },
  centipede: { color: '#2a0a1a', glowColor: '#ff00ff', bodyScale: 1.5 },
  spider: { color: '#0a0a0a', glowColor: '#00ff00', bodyScale: 0.8 },
  scorpion: { color: '#3a1a00', glowColor: '#ffaa00', bodyScale: 1.3 },
  wasp: { color: '#1a1a00', glowColor: '#ffff00', bodyScale: 0.6 },
};

// 3D Snail with realistic spiral shell
function Snail({ position, rotation }: { position: [number, number]; rotation: number }) {
  return (
    <group position={[position[0], 0.25, position[1]]} rotation={[0, rotation, 0]}>
      {/* Realistic spiral shell - main dome */}
      <mesh position={[0, 0.45, -0.15]} rotation={[0.2, 0, 0]}>
        <sphereGeometry args={[0.55, 24, 24]} />
        <meshStandardMaterial color="#c9a66b" roughness={0.4} metalness={0.1} />
      </mesh>
      
      {/* Shell spiral pattern - multiple layers creating spiral effect */}
      <mesh position={[0.15, 0.55, -0.2]} rotation={[0.3, 0.5, 0.2]}>
        <torusGeometry args={[0.35, 0.06, 12, 24]} />
        <meshStandardMaterial color="#a67c4a" roughness={0.5} />
      </mesh>
      <mesh position={[0.08, 0.5, -0.15]} rotation={[0.2, 0.3, 0.1]}>
        <torusGeometry args={[0.25, 0.05, 12, 20]} />
        <meshStandardMaterial color="#8b6239" roughness={0.5} />
      </mesh>
      <mesh position={[0.05, 0.48, -0.1]} rotation={[0.1, 0.2, 0]}>
        <torusGeometry args={[0.15, 0.04, 10, 16]} />
        <meshStandardMaterial color="#6b4423" roughness={0.5} />
      </mesh>
      {/* Shell center spiral */}
      <mesh position={[0.02, 0.5, -0.05]} rotation={[0, 0.1, 0]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color="#5a3a1a" roughness={0.6} />
      </mesh>
      
      {/* Shell bands/stripes for realism */}
      <mesh position={[-0.2, 0.4, -0.2]} rotation={[0.4, -0.3, 0]}>
        <torusGeometry args={[0.4, 0.02, 8, 24]} />
        <meshStandardMaterial color="#8b6239" roughness={0.5} />
      </mesh>
      <mesh position={[-0.1, 0.35, -0.25]} rotation={[0.5, -0.2, 0]}>
        <torusGeometry args={[0.45, 0.02, 8, 24]} />
        <meshStandardMaterial color="#a67c4a" roughness={0.5} />
      </mesh>
      
      {/* Snail body - soft, slug-like */}
      <mesh position={[0, 0.12, 0.35]}>
        <capsuleGeometry args={[0.18, 0.5, 12, 16]} />
        <meshStandardMaterial color="#d4c4a8" roughness={0.7} metalness={0} />
      </mesh>
      
      {/* Body texture bumps */}
      <mesh position={[0.08, 0.15, 0.25]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#c9b898" roughness={0.8} />
      </mesh>
      <mesh position={[-0.08, 0.14, 0.3]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#c9b898" roughness={0.8} />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 0.18, 0.6]}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshStandardMaterial color="#d4c4a8" roughness={0.7} />
      </mesh>
      
      {/* Eye stalks - realistic tentacles */}
      <mesh position={[-0.08, 0.28, 0.65]} rotation={[-0.4, 0, -0.15]}>
        <capsuleGeometry args={[0.025, 0.22, 8, 10]} />
        <meshStandardMaterial color="#d4c4a8" roughness={0.7} />
      </mesh>
      <mesh position={[0.08, 0.28, 0.65]} rotation={[-0.4, 0, 0.15]}>
        <capsuleGeometry args={[0.025, 0.22, 8, 10]} />
        <meshStandardMaterial color="#d4c4a8" roughness={0.7} />
      </mesh>
      
      {/* Eyes on stalks */}
      <mesh position={[-0.1, 0.42, 0.72]}>
        <sphereGeometry args={[0.04, 10, 10]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      <mesh position={[0.1, 0.42, 0.72]}>
        <sphereGeometry args={[0.04, 10, 10]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      
      {/* Lower tentacles (feelers) */}
      <mesh position={[-0.05, 0.12, 0.7]} rotation={[-0.2, 0, -0.1]}>
        <capsuleGeometry args={[0.015, 0.1, 6, 8]} />
        <meshStandardMaterial color="#d4c4a8" roughness={0.7} />
      </mesh>
      <mesh position={[0.05, 0.12, 0.7]} rotation={[-0.2, 0, 0.1]}>
        <capsuleGeometry args={[0.015, 0.1, 6, 8]} />
        <meshStandardMaterial color="#d4c4a8" roughness={0.7} />
      </mesh>
      
      {/* Foot/base of snail */}
      <mesh position={[0, 0.02, 0.2]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.25, 0.04, 0.8]} />
        <meshStandardMaterial color="#c9b898" roughness={0.8} />
      </mesh>
      
      {/* Gun mount on shell */}
      <mesh position={[0.45, 0.55, -0.1]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.35, 0.05, 0.06]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.8} />
      </mesh>
      
      {/* Machine gun */}
      <group position={[0.55, 0.6, 0.25]} rotation={[0, 0, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.08, 0.7, 12]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.9} roughness={0.1} />
        </mesh>
        {[0.08, 0.2, 0.32].map((z, i) => (
          <mesh key={i} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.07, 0.012, 8, 16]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.95} roughness={0.05} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.06, 0.1, 12]} />
          <meshStandardMaterial color="#0a0a0a" metalness={0.95} roughness={0.05} />
        </mesh>
        <mesh position={[0, 0.04, -0.12]}>
          <boxGeometry args={[0.12, 0.15, 0.25]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.08, -0.12]}>
          <boxGeometry args={[0.08, 0.16, 0.06]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

// Realistic bug component - crawls on ground
function Bug({ bug }: { bug: Bug }) {
  const config = BUG_CONFIGS[bug.type];
  const s = bug.scale * config.bodyScale;
  const meshRef = useRef<THREE.Group>(null);
  const legPhase = useRef(Math.random() * Math.PI * 2);
  
  useFrame((state) => {
    if (meshRef.current) {
      // Face direction of movement
      const dx = bug.velocity[0];
      const dz = bug.velocity[1];
      if (dx !== 0 || dz !== 0) {
        meshRef.current.rotation.y = Math.atan2(dx, dz);
      }
      // Crawling leg animation
      legPhase.current += 0.15;
    }
  });
  
  const legWiggle = Math.sin(legPhase.current) * 0.3;
  
  return (
    <group position={[bug.position[0], 0.08, bug.position[2]]} ref={meshRef} scale={[s, s, s]}>
      {bug.type === 'beetle' && (
        <>
          {/* Body - oval shaped */}
          <mesh position={[0, 0.12, 0]} rotation={[0, 0, 0]}>
            <sphereGeometry args={[0.3, 16, 12]} />
            <meshStandardMaterial color="#1a1206" roughness={0.3} metalness={0.4} />
          </mesh>
          {/* Shell/elytra */}
          <mesh position={[0, 0.18, -0.05]} scale={[1, 0.6, 1.2]}>
            <sphereGeometry args={[0.28, 16, 12]} />
            <meshStandardMaterial color="#2a1f10" roughness={0.2} metalness={0.5} />
          </mesh>
          {/* Head */}
          <mesh position={[0, 0.1, 0.3]}>
            <sphereGeometry args={[0.12, 12, 10]} />
            <meshStandardMaterial color="#1a1206" roughness={0.4} />
          </mesh>
          {/* Mandibles */}
          <mesh position={[-0.06, 0.08, 0.4]} rotation={[0, 0.4, 0]}>
            <coneGeometry args={[0.03, 0.1, 6]} />
            <meshStandardMaterial color="#0a0a00" />
          </mesh>
          <mesh position={[0.06, 0.08, 0.4]} rotation={[0, -0.4, 0]}>
            <coneGeometry args={[0.03, 0.1, 6]} />
            <meshStandardMaterial color="#0a0a00" />
          </mesh>
          {/* Antennae */}
          <mesh position={[-0.05, 0.15, 0.35]} rotation={[-0.5, -0.3, 0]}>
            <capsuleGeometry args={[0.01, 0.15, 4, 6]} />
            <meshStandardMaterial color="#1a1206" />
          </mesh>
          <mesh position={[0.05, 0.15, 0.35]} rotation={[-0.5, 0.3, 0]}>
            <capsuleGeometry args={[0.01, 0.15, 4, 6]} />
            <meshStandardMaterial color="#1a1206" />
          </mesh>
          {/* Legs - 6 legs with crawling animation */}
          {[-1, 1].map((side) => (
            [0.15, 0, -0.15].map((zOff, i) => (
              <mesh key={`leg-${side}-${i}`} position={[side * 0.2, 0.05, zOff]} rotation={[legWiggle * (i % 2 === 0 ? 1 : -1), 0, side * 0.8]}>
                <capsuleGeometry args={[0.02, 0.2, 4, 6]} />
                <meshStandardMaterial color="#1a1206" />
              </mesh>
            ))
          ))}
        </>
      )}
      
      {bug.type === 'centipede' && (
        <>
          {/* Segmented body */}
          {[0, 0.18, 0.36, -0.18, -0.36, -0.54].map((z, i) => (
            <group key={i}>
              <mesh position={[0, 0.08, z]}>
                <sphereGeometry args={[0.12, 10, 8]} />
                <meshStandardMaterial color={i === 0 ? "#3a1515" : "#2a0a0a"} roughness={0.5} />
              </mesh>
              {/* Legs per segment */}
              <mesh position={[-0.12, 0.03, z]} rotation={[legWiggle * (i % 2 === 0 ? 1 : -1), 0, -0.6]}>
                <capsuleGeometry args={[0.015, 0.12, 4, 6]} />
                <meshStandardMaterial color="#2a0a0a" />
              </mesh>
              <mesh position={[0.12, 0.03, z]} rotation={[legWiggle * (i % 2 === 0 ? -1 : 1), 0, 0.6]}>
                <capsuleGeometry args={[0.015, 0.12, 4, 6]} />
                <meshStandardMaterial color="#2a0a0a" />
              </mesh>
            </group>
          ))}
          {/* Antennae */}
          <mesh position={[-0.05, 0.1, 0.12]} rotation={[-0.4, -0.3, 0]}>
            <capsuleGeometry args={[0.01, 0.15, 4, 6]} />
            <meshStandardMaterial color="#3a1515" />
          </mesh>
          <mesh position={[0.05, 0.1, 0.12]} rotation={[-0.4, 0.3, 0]}>
            <capsuleGeometry args={[0.01, 0.15, 4, 6]} />
            <meshStandardMaterial color="#3a1515" />
          </mesh>
        </>
      )}
      
      {bug.type === 'spider' && (
        <>
          {/* Abdomen */}
          <mesh position={[0, 0.15, -0.15]} scale={[1, 0.8, 1.3]}>
            <sphereGeometry args={[0.2, 12, 10]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
          </mesh>
          {/* Cephalothorax */}
          <mesh position={[0, 0.12, 0.1]}>
            <sphereGeometry args={[0.12, 10, 8]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.5} />
          </mesh>
          {/* 8 legs */}
          {[-1, 1].map((side) => (
            [0.12, 0.04, -0.04, -0.12].map((zOff, i) => (
              <group key={`leg-${side}-${i}`}>
                <mesh position={[side * 0.1, 0.1, zOff]} rotation={[legWiggle * (i % 2 === 0 ? 1 : -1) * 0.5, 0, side * (0.5 + i * 0.15)]}>
                  <capsuleGeometry args={[0.015, 0.25, 4, 6]} />
                  <meshStandardMaterial color="#1a1a1a" />
                </mesh>
              </group>
            ))
          ))}
          {/* Fangs */}
          <mesh position={[-0.03, 0.08, 0.2]} rotation={[0.3, 0, 0]}>
            <coneGeometry args={[0.015, 0.06, 6]} />
            <meshStandardMaterial color="#3a0000" />
          </mesh>
          <mesh position={[0.03, 0.08, 0.2]} rotation={[0.3, 0, 0]}>
            <coneGeometry args={[0.015, 0.06, 6]} />
            <meshStandardMaterial color="#3a0000" />
          </mesh>
        </>
      )}
      
      {bug.type === 'scorpion' && (
        <>
          {/* Body */}
          <mesh position={[0, 0.08, 0]} scale={[1, 0.5, 1.5]}>
            <boxGeometry args={[0.25, 0.15, 0.35]} />
            <meshStandardMaterial color="#3a2810" roughness={0.6} />
          </mesh>
          {/* Tail segments */}
          {[0.25, 0.4, 0.52, 0.62].map((z, i) => (
            <mesh key={i} position={[0, 0.1 + i * 0.08, -z]} rotation={[-0.3 * i, 0, 0]}>
              <sphereGeometry args={[0.06 - i * 0.01, 8, 6]} />
              <meshStandardMaterial color="#3a2810" roughness={0.5} />
            </mesh>
          ))}
          {/* Stinger */}
          <mesh position={[0, 0.45, -0.7]} rotation={[0.5, 0, 0]}>
            <coneGeometry args={[0.03, 0.12, 6]} />
            <meshStandardMaterial color="#2a0000" />
          </mesh>
          {/* Pincers */}
          <mesh position={[-0.15, 0.08, 0.25]}>
            <sphereGeometry args={[0.08, 8, 6]} />
            <meshStandardMaterial color="#3a2810" />
          </mesh>
          <mesh position={[0.15, 0.08, 0.25]}>
            <sphereGeometry args={[0.08, 8, 6]} />
            <meshStandardMaterial color="#3a2810" />
          </mesh>
          {/* Legs */}
          {[-1, 1].map((side) => (
            [0.1, 0, -0.1, -0.2].map((zOff, i) => (
              <mesh key={`leg-${side}-${i}`} position={[side * 0.12, 0.04, zOff]} rotation={[legWiggle * (i % 2 === 0 ? 1 : -1), 0, side * 0.7]}>
                <capsuleGeometry args={[0.015, 0.15, 4, 6]} />
                <meshStandardMaterial color="#3a2810" />
              </mesh>
            ))
          ))}
        </>
      )}
      
      {bug.type === 'wasp' && (
        <>
          {/* Abdomen - striped */}
          <mesh position={[0, 0.12, -0.12]} scale={[0.8, 0.8, 1.2]}>
            <capsuleGeometry args={[0.1, 0.15, 8, 12]} />
            <meshStandardMaterial color="#1a1a00" roughness={0.4} />
          </mesh>
          {/* Yellow stripes */}
          <mesh position={[0, 0.12, -0.08]} scale={[0.82, 0.82, 0.15]}>
            <sphereGeometry args={[0.1, 8, 6]} />
            <meshStandardMaterial color="#ffd700" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.12, -0.18]} scale={[0.82, 0.82, 0.15]}>
            <sphereGeometry args={[0.1, 8, 6]} />
            <meshStandardMaterial color="#ffd700" roughness={0.4} />
          </mesh>
          {/* Thorax */}
          <mesh position={[0, 0.12, 0.08]}>
            <sphereGeometry args={[0.08, 10, 8]} />
            <meshStandardMaterial color="#1a1a00" roughness={0.4} />
          </mesh>
          {/* Head */}
          <mesh position={[0, 0.12, 0.18]}>
            <sphereGeometry args={[0.06, 8, 6]} />
            <meshStandardMaterial color="#1a1a00" />
          </mesh>
          {/* Wings */}
          <mesh position={[-0.08, 0.18, 0]} rotation={[0, 0, -0.3]}>
            <planeGeometry args={[0.2, 0.08]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0.08, 0.18, 0]} rotation={[0, 0, 0.3]}>
            <planeGeometry args={[0.2, 0.08]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
          {/* Stinger */}
          <mesh position={[0, 0.1, -0.28]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.015, 0.08, 6]} />
            <meshStandardMaterial color="#1a0a00" />
          </mesh>
          {/* Legs */}
          {[-1, 1].map((side) => (
            [0.05, 0, -0.05].map((zOff, i) => (
              <mesh key={`leg-${side}-${i}`} position={[side * 0.06, 0.05, zOff]} rotation={[0, 0, side * 0.5]}>
                <capsuleGeometry args={[0.01, 0.1, 4, 6]} />
                <meshStandardMaterial color="#1a1a00" />
              </mesh>
            ))
          ))}
        </>
      )}
      
      {/* Eyes */}
      <mesh position={[0.04, 0.14, 0.25]}>
        <sphereGeometry args={[0.025, 6, 6]} />
        <meshStandardMaterial color="#200000" />
      </mesh>
      <mesh position={[-0.04, 0.14, 0.25]}>
        <sphereGeometry args={[0.025, 6, 6]} />
        <meshStandardMaterial color="#200000" />
      </mesh>
    </group>
  );
}

// Bullet component
function Bullet({ bullet }: { bullet: Bullet }) {
  return (
    <group position={bullet.position}>
      <mesh rotation={[Math.PI / 2, 0, Math.atan2(bullet.velocity[1], bullet.velocity[0])]}>
        <capsuleGeometry args={[0.15, 0.4, 4, 8]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color="#ff3300" />
      </mesh>
    </group>
  );
}

// Power-up component
function PowerUpMesh({ powerUp }: { powerUp: PowerUp }) {
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 2;
      meshRef.current.position.y = 0.5 + Math.sin(Date.now() * 0.003) * 0.15;
    }
  });
  
  return (
    <group ref={meshRef} position={[powerUp.position[0], powerUp.position[1], powerUp.position[2]]}>
      {powerUp.type === 'health' && (
        <>
          <mesh>
            <boxGeometry args={[0.45, 0.45, 0.45]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 0, 0.24]}>
            <boxGeometry args={[0.3, 0.1, 0.02]} />
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.24]}>
            <boxGeometry args={[0.1, 0.3, 0.02]} />
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.3} />
          </mesh>
          <pointLight color="#00ff00" intensity={0.5} distance={3} />
        </>
      )}
      {powerUp.type === 'doubleDamage' && (
        <>
          <mesh>
            <octahedronGeometry args={[0.3, 0]} />
            <meshStandardMaterial color="#ff8800" emissive="#ffaa00" emissiveIntensity={0.5} />
          </mesh>
          <pointLight color="#ffaa00" intensity={0.8} distance={4} />
        </>
      )}
    </group>
  );
}

// Tree component
function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Trunk */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.15, 0.25, 2, 8]} />
        <meshStandardMaterial color="#4a3728" roughness={0.9} />
      </mesh>
      {/* Foliage layers */}
      <mesh position={[0, 2.5, 0]}>
        <coneGeometry args={[1.2, 2, 8]} />
        <meshStandardMaterial color="#2d5a27" roughness={0.8} />
      </mesh>
      <mesh position={[0, 3.3, 0]}>
        <coneGeometry args={[0.9, 1.5, 8]} />
        <meshStandardMaterial color="#3d7a37" roughness={0.8} />
      </mesh>
      <mesh position={[0, 4, 0]}>
        <coneGeometry args={[0.5, 1, 8]} />
        <meshStandardMaterial color="#4d8a47" roughness={0.8} />
      </mesh>
    </group>
  );
}

// Grass tuft component - using useMemo pattern via static values
function GrassTuft({ position, seed }: { position: [number, number, number]; seed: number }) {
  // Use seed to generate deterministic random values
  const rotations = [
    [(seed * 0.1) % 0.3 - 0.15, (seed * 0.2) % Math.PI, 0],
    [(seed * 0.15) % 0.3 - 0.15, (seed * 0.25) % Math.PI, 0],
    [(seed * 0.12) % 0.3 - 0.15, (seed * 0.3) % Math.PI, 0],
  ];
  
  return (
    <group position={position}>
      {[-0.08, 0, 0.08].map((offset, i) => (
        <mesh key={i} position={[offset, 0.15, offset * 0.5]} rotation={rotations[i] as [number, number, number]}>
          <planeGeometry args={[0.1, 0.3]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#5a8a3a" : "#4a7a2a"} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// Forest ground with trees and grass - using useMemo to prevent re-renders
function ForestGround() {
  // Pre-computed deterministic positions using seeded pseudo-random
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  // Generate tree positions deterministically
  const trees = [];
  for (let i = 0; i < 60; i++) {
    const seed = i * 1.618;
    const angle = seededRandom(seed) * Math.PI * 2;
    const distance = 18 + seededRandom(seed + 1) * 15;
    const x = Math.sin(angle) * distance;
    const z = Math.cos(angle) * distance;
    trees.push({ x, z, scale: 0.8 + seededRandom(seed + 2) * 0.6, key: i });
  }
  
  // Add more trees scattered around
  for (let i = 60; i < 100; i++) {
    const seed = i * 2.718;
    const x = (seededRandom(seed) - 0.5) * 50;
    const z = (seededRandom(seed + 1) - 0.5) * 50;
    const distFromCenter = Math.sqrt(x * x + z * z);
    if (distFromCenter > 12) {
      trees.push({ x, z, scale: 0.6 + seededRandom(seed + 2) * 0.8, key: i });
    }
  }
  
  // Generate grass positions with seeds
  const grass = [];
  for (let i = 0; i < 200; i++) {
    const seed = i * 1.618;
    const x = (seededRandom(seed) - 0.5) * 45;
    const z = (seededRandom(seed + 0.5) - 0.5) * 45;
    grass.push({ x, z, key: i, seed });
  }

  // Generate rock positions deterministically
  const rocks = [];
  for (let i = 0; i < 20; i++) {
    const seed = i * 3.14159;
    const x = (seededRandom(seed) - 0.5) * 35;
    const z = (seededRandom(seed + 1) - 0.5) * 35;
    const scale = 0.2 + seededRandom(seed + 2) * 0.4;
    const rotX = seededRandom(seed + 3) * Math.PI;
    const rotY = seededRandom(seed + 4) * Math.PI;
    const rotZ = seededRandom(seed + 5) * Math.PI;
    rocks.push({ x, z, scale, rotX, rotY, rotZ, key: i });
  }

  return (
    <>
      {/* Main ground - forest floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#4a6a3a" roughness={0.9} />
      </mesh>
      
      {/* Grass patches layer */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[18, 32]} />
        <meshStandardMaterial color="#5a7a45" roughness={0.85} />
      </mesh>
      
      {/* Dirt path in center */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[8, 24]} />
        <meshStandardMaterial color="#6a5a45" roughness={0.95} />
      </mesh>
      
      {/* Trees */}
      {trees.map((tree) => (
        <Tree key={tree.key} position={[tree.x, 0, tree.z]} scale={tree.scale} />
      ))}
      
      {/* Grass tufts */}
      {grass.map((g) => (
        <GrassTuft key={g.key} position={[g.x, 0, g.z]} seed={g.seed} />
      ))}
      
      {/* Rocks scattered around */}
      {rocks.map((rock) => (
        <mesh key={`rock-${rock.key}`} position={[rock.x, rock.scale * 0.3, rock.z]} rotation={[rock.rotX, rock.rotY, rock.rotZ]}>
          <dodecahedronGeometry args={[rock.scale, 0]} />
          <meshStandardMaterial color="#6a6a6a" roughness={0.9} />
        </mesh>
      ))}
    </>
  );
}

// True 3rd person camera - behind and slightly above the snail, looking over its shoulder
function ThirdPersonCamera({ targetPosition, targetRotation }: { targetPosition: [number, number]; targetRotation: number }) {
  const { camera } = useThree();
  const cameraRef = useRef({ x: 0, y: 3, z: -5 });
  
  useFrame((_, delta) => {
    // Camera position: directly behind the snail based on its rotation
    const distance = 4; // Distance behind snail
    const height = 2.5; // Height above ground
    const lookAheadDistance = 3; // How far ahead to look
    
    // Calculate position behind the snail
    const behindX = targetPosition[0] - Math.sin(targetRotation) * distance;
    const behindZ = targetPosition[1] - Math.cos(targetRotation) * distance;
    
    // Calculate look-at point (ahead of the snail)
    const lookAtX = targetPosition[0] + Math.sin(targetRotation) * lookAheadDistance;
    const lookAtZ = targetPosition[1] + Math.cos(targetRotation) * lookAheadDistance;
    
    // Smooth camera follow with faster response
    const smoothness = 5;
    cameraRef.current.x += (behindX - cameraRef.current.x) * delta * smoothness;
    cameraRef.current.y += (height - cameraRef.current.y) * delta * smoothness;
    cameraRef.current.z += (behindZ - cameraRef.current.z) * delta * smoothness;
    
    camera.position.set(cameraRef.current.x, cameraRef.current.y, cameraRef.current.z);
    camera.lookAt(lookAtX, 0.8, lookAtZ);
  });
  
  return null;
}

// Game logic component
function GameScene({ 
  gameState, 
  setGameState, 
  difficulty,
  highScore,
  setHighScore,
  touchMove,
  touchShooting
}: { 
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  difficulty: Difficulty;
  highScore: number;
  setHighScore: React.Dispatch<React.SetStateAction<number>>;
  touchMove: React.MutableRefObject<{ dx: number; dy: number }>;
  touchShooting: React.MutableRefObject<boolean>;
}) {
  const keysPressed = useRef<Set<string>>(new Set());
  const lastSpawn = useRef(0);
  const lastPowerUpSpawn = useRef(0);
  const lastShot = useRef(0);
  const isShooting = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      keysPressed.current.add(e.key.toLowerCase());
      if (e.key === ' ') {
        isShooting.current = true;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
      if (e.key === ' ') {
        isShooting.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    if (gameState.status !== 'playing') return;

    const speedMult = SPEED_MULTIPLIERS[difficulty];
    const moveSpeed = 5 * delta;
    const rotateSpeed = 3 * delta;

    let forward = 0;
    let turn = 0;
    
    // Forward/backward movement
    if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) {
      forward = moveSpeed;
    }
    if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) {
      forward = -moveSpeed;
    }
    
    // Turning left/right
    if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) {
      turn = rotateSpeed;
    }
    if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) {
      turn = -rotateSpeed;
    }
    
    // Touch controls
    if (touchMove.current.dy !== 0) {
      forward = -moveSpeed * touchMove.current.dy;
    }
    if (touchMove.current.dx !== 0) {
      turn = -rotateSpeed * touchMove.current.dx;
    }

    // Machine gun firing
    const now = performance.now();
    if ((isShooting.current || touchShooting.current) && gameState.status === 'playing' && now - lastShot.current > 80) {
      lastShot.current = now;
      const angle = gameState.snailRotation;
      const spread = (Math.random() - 0.5) * 0.15;
      const velocity: [number, number] = [
        Math.sin(angle + spread) * 0.8,
        Math.cos(angle + spread) * 0.8
      ];
      const newBullet: Bullet = {
        id: Date.now() + Math.random(),
        position: [
          gameState.snailPosition[0] + Math.sin(angle) * 1,
          0.5,
          gameState.snailPosition[1] + Math.cos(angle) * 1
        ],
        velocity
      };
      setGameState(prev => ({
        ...prev,
        bullets: [...prev.bullets, newBullet]
      }));
    }

    // Spawn bugs
    if (now - lastSpawn.current > 2000 / speedMult) {
      lastSpawn.current = now;
      const angle = Math.random() * Math.PI * 2;
      const distance = 12 + Math.random() * 3;
      const bugTypes: Bug['type'][] = ['beetle', 'centipede', 'spider', 'scorpion', 'wasp'];
      const newBug: Bug = {
        id: Date.now() + Math.random(),
        position: [
          gameState.snailPosition[0] + Math.sin(angle) * distance,
          0.35,
          gameState.snailPosition[1] + Math.cos(angle) * distance
        ],
        velocity: [0, 0],
        type: bugTypes[Math.floor(Math.random() * bugTypes.length)],
        health: 1,
        scale: 0.8 + Math.random() * 0.6
      };
      setGameState(prev => ({
        ...prev,
        bugs: [...prev.bugs, newBug]
      }));
    }
    
    // Spawn power-ups
    if (now - lastPowerUpSpawn.current > 8000 + Math.random() * 7000) {
      lastPowerUpSpawn.current = now;
      const powerUpType: PowerUp['type'] = Math.random() > 0.5 ? 'health' : 'doubleDamage';
      const newPowerUp: PowerUp = {
        id: Date.now() + Math.random(),
        position: [
          gameState.snailPosition[0] + (Math.random() - 0.5) * 16,
          0.5,
          gameState.snailPosition[1] + (Math.random() - 0.5) * 16
        ],
        type: powerUpType
      };
      setGameState(prev => ({
        ...prev,
        powerUps: [...prev.powerUps, newPowerUp]
      }));
    }

    setGameState(prev => {
      // Update rotation
      let newRotation = prev.snailRotation + turn;
      
      // Update position based on rotation
      let newX = prev.snailPosition[0] + Math.sin(newRotation) * forward;
      let newZ = prev.snailPosition[1] + Math.cos(newRotation) * forward;
      
      // Keep snail within bounds
      newX = Math.max(-20, Math.min(20, newX));
      newZ = Math.max(-20, Math.min(20, newZ));

      // Update bullets
      let updatedBullets = prev.bullets
        .map(b => ({
          ...b,
          position: [
            b.position[0] + b.velocity[0],
            b.position[1],
            b.position[2] + b.velocity[1]
          ] as [number, number, number]
        }))
        .filter(b => 
          Math.abs(b.position[0] - newX) < 20 && 
          Math.abs(b.position[2] - newZ) < 20
        );

      // Update bugs - move toward snail
      let updatedBugs = prev.bugs.map(bug => {
        const dirX = newX - bug.position[0];
        const dirZ = newZ - bug.position[2];
        const dist = Math.sqrt(dirX * dirX + dirZ * dirZ);
        const speed = 2 * speedMult * delta;
        
        return {
          ...bug,
          position: [
            bug.position[0] + (dirX / dist) * speed,
            bug.position[1],
            bug.position[2] + (dirZ / dist) * speed
          ] as [number, number, number]
        };
      });

      const isDoubleDamage = performance.now() < prev.doubleDamageUntil;
      const damageMultiplier = isDoubleDamage ? 2 : 1;

      // Check bullet-bug collisions
      let newScore = prev.score;
      let newBugsKilled = prev.bugsKilled;
      
      updatedBugs = updatedBugs.filter(bug => {
        for (let i = updatedBullets.length - 1; i >= 0; i--) {
          const b = updatedBullets[i];
          const dx = bug.position[0] - b.position[0];
          const dz = bug.position[2] - b.position[2];
          const dist = Math.sqrt(dx * dx + dz * dz);
          
          if (dist < 0.5) {
            updatedBullets.splice(i, 1);
            newScore += 10 * damageMultiplier;
            newBugsKilled += 1;
            return false;
          }
        }
        return true;
      });

      // Check power-up collisions
      let newHealth = prev.health;
      let newDoubleDamageUntil = prev.doubleDamageUntil;
      let updatedPowerUps = prev.powerUps.filter(powerUp => {
        const dx = powerUp.position[0] - newX;
        const dz = powerUp.position[2] - newZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < 0.8) {
          if (powerUp.type === 'health') {
            newHealth = Math.min(100, newHealth + 30);
          } else if (powerUp.type === 'doubleDamage') {
            newDoubleDamageUntil = performance.now() + 8000;
          }
          return false;
        }
        return true;
      });

      // Check bug-snail collisions
      updatedBugs = updatedBugs.filter(bug => {
        const dx = bug.position[0] - newX;
        const dz = bug.position[2] - newZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < 0.7) {
          newHealth -= 20;
          return false;
        }
        return true;
      });

      // Check game over
      if (newHealth <= 0) {
        return {
          ...prev,
          status: 'gameover',
          health: 0,
          score: newScore,
          bugsKilled: newBugsKilled
        };
      }

      newScore += delta * 2;

      return {
        ...prev,
        snailPosition: [newX, newZ],
        snailRotation: newRotation,
        bullets: updatedBullets,
        bugs: updatedBugs,
        powerUps: updatedPowerUps,
        score: newScore,
        bugsKilled: newBugsKilled,
        health: newHealth,
        doubleDamageUntil: newDoubleDamageUntil
      };
    });
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 8, 8]} fov={60} />
      <ThirdPersonCamera targetPosition={gameState.snailPosition} targetRotation={gameState.snailRotation} />
      
      {/* Bright daylight lighting */}
      <ambientLight intensity={0.8} color="#ffffff" />
      <directionalLight position={[15, 40, 15]} intensity={1.2} color="#fffef5" castShadow />
      <directionalLight position={[-10, 25, -10]} intensity={0.5} color="#ffffff" />
      <pointLight position={[0, 20, 0]} intensity={0.4} color="#fffef0" distance={60} />
      <hemisphereLight args={['#87ceeb', '#7cba5c', 0.6]} />
      
      {/* Bright blue sky fog */}
      <fog attach="fog" args={['#87ceeb', 30, 80]} />
      
      {/* Sky background */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[100, 32, 32]} />
        <meshBasicMaterial color="#87ceeb" side={THREE.BackSide} />
      </mesh>
      
      <ForestGround />
      
      <Snail position={gameState.snailPosition} rotation={gameState.snailRotation} />
      
      {gameState.bugs.map(bug => (
        <Bug key={bug.id} bug={bug} />
      ))}
      
      {gameState.bullets.map(bullet => (
        <Bullet key={bullet.id} bullet={bullet} />
      ))}
      
      {gameState.powerUps.map(powerUp => (
        <PowerUpMesh key={powerUp.id} powerUp={powerUp} />
      ))}
    </>
  );
}

export const SnailGame3rdPerson = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [highScore, setHighScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const gameStartTime = useRef<number>(0);
  
  const touchMove = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const touchShooting = useRef(false);
  const joystickRef = useRef<HTMLDivElement>(null);
  const joystickStartPos = useRef<{ x: number; y: number } | null>(null);
  
  const [gameState, setGameState] = useState<GameState>({
    status: 'idle',
    score: 0,
    bugsKilled: 0,
    snailPosition: [0, 0],
    snailRotation: 0,
    bugs: [],
    bullets: [],
    powerUps: [],
    health: 100,
    doubleDamageUntil: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: leaderboardData, error: leaderboardError } = await supabase
          .from('leaderboard')
          .select('*')
          .order('score', { ascending: false })
          .limit(10);
        
        if (leaderboardError) throw leaderboardError;
        
        setLeaderboard(leaderboardData || []);
        if (leaderboardData && leaderboardData.length > 0) {
          setHighScore(leaderboardData[0].score);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const isHighScore = (score: number) => {
    if (leaderboard.length < 10) return true;
    return score > leaderboard[leaderboard.length - 1].score;
  };

  const submitScore = async () => {
    if (!playerName.trim()) return;
    
    const gameDuration = Math.floor((Date.now() - gameStartTime.current) / 1000);
    const score = Math.floor(gameState.score);
    const bugsKilled = gameState.bugsKilled;
    const name = playerName.trim().slice(0, 50);
    
    try {
      const { data: success, error } = await supabase
        .rpc('submit_score', {
          p_name: name,
          p_score: score,
          p_game_duration: gameDuration,
          p_bugs_killed: bugsKilled
        });
      
      if (error) throw error;
      
      if (!success) {
        toast.error("Score validation failed. Please play legitimately!");
        setPlayerName('');
        setScoreSubmitted(true);
        setGameState(prev => ({ ...prev, status: 'gameover' }));
        return;
      }
      
      const { data } = await supabase
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false })
        .limit(10);
      
      if (data) {
        setLeaderboard(data);
        if (data.length > 0) {
          setHighScore(data[0].score);
        }
      }
      
      toast.success("Score submitted to leaderboard!");
    } catch (error) {
      console.error('Error submitting score:', error);
      toast.error("Failed to submit score. Try again!");
    }
    
    setPlayerName('');
    setScoreSubmitted(true);
    setGameState(prev => ({ ...prev, status: 'gameover' }));
  };

  const startGame = useCallback(async () => {
    setScoreSubmitted(false);
    gameStartTime.current = Date.now();
    
    setGameState({
      status: 'playing',
      score: 0,
      bugsKilled: 0,
      snailPosition: [0, 0],
      snailRotation: 0,
      bugs: [],
      bullets: [],
      powerUps: [],
      health: 100,
      doubleDamageUntil: 0
    });
  }, []);

  useEffect(() => {
    if (gameState.status === 'gameover' && gameState.health === 0 && !scoreSubmitted) {
      const finalScore = Math.floor(gameState.score);
      if (finalScore > 0 && isHighScore(finalScore)) {
        setGameState(prev => ({ ...prev, status: 'entering_name' }));
      }
    }
  }, [gameState.status, gameState.health, gameState.score, scoreSubmitted]);

  return (
    <section className="py-8 sm:py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-2">
          <img src={snailTexture} alt="Snail" className="w-12 h-12 object-contain" />
          <h2 className="font-display text-3xl sm:text-4xl text-center text-primary">
            Snail Shooter 3D!
          </h2>
          <span className="text-3xl">🎮</span>
        </div>
        <p className="font-body text-base sm:text-lg text-center text-muted-foreground mb-2">
          <span className="hidden sm:inline">Hold SPACE to shoot! W/S to move, A/D to turn!</span>
          <span className="sm:hidden">Use joystick to move/turn, FIRE button to shoot!</span>
        </p>
        <p className="font-display text-sm text-center text-accent mb-4">
          🧪 3rd Person Mode - BETA
        </p>

        {/* Game area - taller for 3rd person view */}
        <div 
          className="relative w-full rounded-2xl retro-border overflow-hidden"
          style={{ height: 500 }}
        >
          <Canvas>
            <GameScene 
              gameState={gameState} 
              setGameState={setGameState} 
              difficulty={difficulty}
              highScore={highScore}
              setHighScore={setHighScore}
              touchMove={touchMove}
              touchShooting={touchShooting}
            />
          </Canvas>

          {/* HUD */}
          {gameState.status === 'playing' && (
            <div className="absolute top-0 left-0 right-0 p-3 pointer-events-none">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-red-500 text-lg">❤️</span>
                    <div className="w-32 h-4 bg-black/50 rounded-full overflow-hidden border border-white/20">
                      <div 
                        className="h-full transition-all duration-200"
                        style={{ 
                          width: `${gameState.health}%`,
                          background: gameState.health > 50 
                            ? 'linear-gradient(90deg, #22c55e, #4ade80)' 
                            : gameState.health > 25 
                              ? 'linear-gradient(90deg, #eab308, #facc15)'
                              : 'linear-gradient(90deg, #dc2626, #ef4444)'
                        }}
                      />
                    </div>
                    <span className="text-white font-display text-sm drop-shadow-lg">{gameState.health}</span>
                  </div>
                  {gameState.doubleDamageUntil > performance.now() && (
                    <div className="bg-orange-500/80 px-2 py-1 rounded-lg animate-pulse">
                      <span className="text-white font-display text-xs">⚡2X DAMAGE⚡</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4 font-display text-white drop-shadow-lg">
                  <span className="bg-black/40 px-3 py-1 rounded-lg">
                    Score: <span className="text-yellow-400">{Math.floor(gameState.score)}</span>
                  </span>
                  <span className="bg-black/40 px-3 py-1 rounded-lg">
                    💀 <span className="text-red-400">{gameState.bugsKilled}</span>
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Mobile Controls */}
          {gameState.status === 'playing' && (
            <>
              <div
                ref={joystickRef}
                className="absolute bottom-4 left-4 w-28 h-28 sm:hidden touch-none"
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  const rect = e.currentTarget.getBoundingClientRect();
                  joystickStartPos.current = {
                    x: touch.clientX - rect.left - rect.width / 2,
                    y: touch.clientY - rect.top - rect.height / 2
                  };
                }}
                onTouchMove={(e) => {
                  if (!joystickStartPos.current) return;
                  const touch = e.touches[0];
                  const rect = e.currentTarget.getBoundingClientRect();
                  const dx = (touch.clientX - rect.left - rect.width / 2) / (rect.width / 2);
                  const dy = (touch.clientY - rect.top - rect.height / 2) / (rect.height / 2);
                  touchMove.current = {
                    dx: Math.max(-1, Math.min(1, dx)),
                    dy: Math.max(-1, Math.min(1, dy))
                  };
                }}
                onTouchEnd={() => {
                  joystickStartPos.current = null;
                  touchMove.current = { dx: 0, dy: 0 };
                }}
              >
                <div className="w-full h-full rounded-full bg-black/40 border-2 border-white/30 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/50 border-2 border-white/70" />
                </div>
                <div className="absolute -bottom-6 left-0 right-0 text-center text-white/70 text-xs font-display">
                  MOVE
                </div>
              </div>
              
              <div
                className="absolute bottom-4 right-4 w-24 h-24 sm:hidden touch-none"
                onTouchStart={() => {
                  touchShooting.current = true;
                }}
                onTouchEnd={() => {
                  touchShooting.current = false;
                }}
              >
                <div className="w-full h-full rounded-full bg-red-600/80 border-4 border-red-400 flex items-center justify-center active:bg-red-500 active:scale-95 transition-transform">
                  <span className="text-white font-display text-lg">FIRE</span>
                </div>
              </div>
            </>
          )}
          
          {/* Overlays */}
          {gameState.status === 'idle' && (
            <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center p-4">
              <img src={snailTexture} alt="Snail" className="w-20 h-20 object-contain mb-2" />
              <h3 className="font-display text-2xl text-primary mb-4">3rd Person Mode</h3>
              
              <div className="flex gap-2 mb-4">
                {(['slow', 'medium', 'hard'] as Difficulty[]).map((d) => (
                  <Button
                    key={d}
                    variant={difficulty === d ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDifficulty(d)}
                    className="font-display capitalize"
                  >
                    {d}
                  </Button>
                ))}
              </div>
              
              <Button onClick={startGame} size="lg" className="font-display text-lg px-8">
                🎮 START GAME
              </Button>
            </div>
          )}

          {gameState.status === 'entering_name' && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
              <h3 className="font-display text-2xl text-yellow-400 mb-2">🏆 HIGH SCORE!</h3>
              <p className="font-display text-3xl text-primary mb-4">{Math.floor(gameState.score)}</p>
              <p className="font-body text-muted-foreground mb-4">Enter your name for the leaderboard:</p>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Your name"
                maxLength={50}
                className="w-48 px-4 py-2 rounded-lg border-2 border-primary bg-background text-foreground font-display text-center mb-4"
                onKeyDown={(e) => e.key === 'Enter' && submitScore()}
              />
              <div className="flex gap-2">
                <Button onClick={submitScore} className="font-display">
                  Submit Score
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setScoreSubmitted(true);
                    setGameState(prev => ({ ...prev, status: 'gameover' }));
                  }}
                  className="font-display"
                >
                  Skip
                </Button>
              </div>
            </div>
          )}

          {gameState.status === 'gameover' && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
              <h3 className="font-display text-3xl text-destructive mb-2">GAME OVER</h3>
              <p className="font-display text-xl text-primary mb-1">Score: {Math.floor(gameState.score)}</p>
              <p className="font-body text-muted-foreground mb-4">Bugs Killed: {gameState.bugsKilled}</p>
              <Button onClick={startGame} size="lg" className="font-display">
                🔄 Play Again
              </Button>
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="mt-6 bg-card/50 rounded-xl p-4 retro-border">
          <h3 className="font-display text-xl text-primary mb-3 text-center">🏆 Leaderboard</h3>
          {isLoading ? (
            <p className="text-center text-muted-foreground">Loading...</p>
          ) : leaderboard.length === 0 ? (
            <p className="text-center text-muted-foreground">No scores yet. Be the first!</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((entry, index) => (
                <div 
                  key={entry.id} 
                  className={`flex justify-between items-center px-3 py-2 rounded-lg ${
                    index === 0 ? 'bg-yellow-500/20' : 
                    index === 1 ? 'bg-gray-400/20' : 
                    index === 2 ? 'bg-orange-600/20' : 'bg-muted/30'
                  }`}
                >
                  <span className="font-display text-lg">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    {' '}{entry.name}
                  </span>
                  <span className="font-display text-accent">{entry.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
