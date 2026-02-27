import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { PerspectiveCamera, Environment, Billboard, useGLTF } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import * as THREE from "three";
import snailTexture from "@/assets/snail-game.png";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProceduralTerrain } from "./game/ProceduralTerrain";
import { RealisticLighting, ForestSkybox } from "./game/RealisticLighting";
import { useIsMobile } from "@/hooks/use-mobile";
import { Volume2, VolumeX } from "lucide-react";
import { useGameSounds } from "@/hooks/useGameSounds";

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
  weaponType?: SpecialWeapon;
}

interface Explosion {
  id: number;
  position: [number, number, number];
  createdAt: number;
  scale: number;
}

interface PowerUp {
  id: number;
  position: [number, number, number];
  type: 'health' | 'doubleDamage' | 'turboSpeed';
}

type SpecialWeapon = 'flamethrower' | 'rocketLauncher' | 'shotgun' | 'laserBeam' | null;

interface WeaponPickup {
  id: number;
  position: [number, number, number];
  type: 'flamethrower' | 'rocketLauncher' | 'shotgun' | 'laserBeam';
}

interface GameState {
  status: 'idle' | 'playing' | 'paused' | 'gameover' | 'entering_name';
  score: number;
  bugsKilled: number;
  snailPosition: [number, number];
  snailRotation: number;
  snailHeight: number;
  snailVelocityY: number;
  isJumping: boolean;
  bugs: Bug[];
  bullets: Bullet[];
  powerUps: PowerUp[];
  weaponPickups: WeaponPickup[];
  explosions: Explosion[];
  health: number;
  doubleDamageUntil: number;
  turboSpeedUntil: number;
  specialWeapon: SpecialWeapon;
  specialWeaponUntil: number;
}

interface LeaderboardEntry {
  id?: string;
  name: string;
  score: number;
  created_at?: string;
  tokens_earned?: number | null;
}

// Obstacle for collision detection
interface Obstacle {
  x: number;
  z: number;
  radius: number; // collision radius
  height: number; // height for jumping on top
  type: 'rock' | 'boulder' | 'log' | 'tree';
}

// Seeded random for consistent obstacle generation
const seededRandomObstacle = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// Generate obstacles once - shared between rendering and collision
const generateObstacles = (): Obstacle[] => {
  const obstacles: Obstacle[] = [];
  
  // Rocks - scattered around play area (fewer, larger collision radii)
  for (let i = 0; i < 15; i++) {
    const seed = i * 3.14159;
    const x = (seededRandomObstacle(seed) - 0.5) * 30;
    const z = (seededRandomObstacle(seed + 1) - 0.5) * 30;
    const scale = 0.6 + seededRandomObstacle(seed + 2) * 0.5;
    const distFromCenter = Math.sqrt(x * x + z * z);
    
    // Don't place rocks too close to center spawn
    if (distFromCenter > 4) {
      obstacles.push({
        x, z,
        radius: scale * 1.5, // Larger collision radius
        height: scale * 0.8,
        type: 'rock'
      });
    }
  }
  
  // Boulders - larger obstacles
  for (let i = 0; i < 8; i++) {
    const seed = i * 5.67 + 100;
    const x = (seededRandomObstacle(seed) - 0.5) * 28;
    const z = (seededRandomObstacle(seed + 1) - 0.5) * 28;
    const scale = 1.0 + seededRandomObstacle(seed + 2) * 0.6;
    const distFromCenter = Math.sqrt(x * x + z * z);
    
    if (distFromCenter > 6) {
      obstacles.push({
        x, z,
        radius: scale * 2.0, // Much larger collision radius
        height: scale * 1.2,
        type: 'boulder'
      });
    }
  }
  
  // Fallen logs
  for (let i = 0; i < 5; i++) {
    const seed = i * 4.567 + 200;
    const x = (seededRandomObstacle(seed) - 0.5) * 26;
    const z = (seededRandomObstacle(seed + 1) - 0.5) * 26;
    const distFromCenter = Math.sqrt(x * x + z * z);
    
    if (distFromCenter > 7) {
      obstacles.push({
        x, z,
        radius: 2.0, // Larger for logs
        height: 0.4,
        type: 'log'
      });
    }
  }
  
  // Trees - these have trunk collision
  for (let i = 0; i < 20; i++) {
    const seed = i * 7.891 + 300;
    const x = (seededRandomObstacle(seed) - 0.5) * 35;
    const z = (seededRandomObstacle(seed + 1) - 0.5) * 35;
    const distFromCenter = Math.sqrt(x * x + z * z);
    
    // Trees at edges and scattered around, not too close to center
    if (distFromCenter > 5) {
      obstacles.push({
        x, z,
        radius: 0.8, // Tree trunk collision radius
        height: 0.3, // Can't climb trees
        type: 'tree'
      });
    }
  }
  
  return obstacles;
};

// Static obstacles list
const GAME_OBSTACLES = generateObstacles();

// Check collision with obstacles
const checkObstacleCollision = (
  newX: number, 
  newZ: number, 
  currentHeight: number,
  obstacles: Obstacle[]
): { blocked: boolean; groundHeight: number } => {
  let groundHeight = 0;
  let blocked = false;
  
  const SNAIL_RADIUS = 0.5; // Snail's collision radius
  
  for (const obs of obstacles) {
    const dx = newX - obs.x;
    const dz = newZ - obs.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const combinedRadius = obs.radius + SNAIL_RADIUS;
    
    // Check if within horizontal collision range
    if (dist < combinedRadius) {
      // If jumping/falling and above the obstacle top, can land on it
      if (currentHeight >= obs.height - 0.05) {
        // Can walk on top - only if close to center
        if (dist < obs.radius * 0.7) {
          groundHeight = Math.max(groundHeight, obs.height);
        }
      } else {
        // Colliding with side - block movement
        blocked = true;
      }
    }
  }
  
  return { blocked, groundHeight };
};

type Difficulty = 'easy' | 'medium' | 'hard';

const SPEED_MULTIPLIERS: Record<Difficulty, number> = {
  easy: 0.7,
  medium: 1.0,
  hard: 1.5,
};

const BUG_SPAWN_COUNTS: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '🐢 Easy',
  medium: '🐛 Medium', 
  hard: '🔥 Hard',
};

const BUG_CONFIGS = {
  beetle: { color: '#1a0a00', glowColor: '#ff3300', bodyScale: 1 },
  centipede: { color: '#2a0a1a', glowColor: '#ff00ff', bodyScale: 1.5 },
  spider: { color: '#0a0a0a', glowColor: '#00ff00', bodyScale: 0.8 },
  scorpion: { color: '#3a1a00', glowColor: '#ffaa00', bodyScale: 1.3 },
  wasp: { color: '#1a1a00', glowColor: '#ffff00', bodyScale: 0.6 },
};

// 3D Snail using sprite with gun on the side - with smooth interpolation
function Snail({ position, rotation, height, specialWeapon, isTurbo, isMobile }: { position: [number, number]; rotation: number; height: number; specialWeapon: SpecialWeapon; isTurbo?: boolean; isMobile?: boolean }) {
  const { scene } = useGLTF('/models/bulbasaur.glb');
  
  const model = useMemo(() => {
    const cloned = scene.clone();
    return cloned;
  }, [scene]);

  const groupRef = useRef<THREE.Group>(null);
  const currentPos = useRef({ x: position[0], y: height, z: position[1], rot: rotation });
  const lightningPhase = useRef(0);
  
  useFrame((_, delta) => {
    if (groupRef.current) {
      const lerpSpeed = 12;
      currentPos.current.x = THREE.MathUtils.lerp(currentPos.current.x, position[0], delta * lerpSpeed);
      currentPos.current.y = THREE.MathUtils.lerp(currentPos.current.y, height, delta * lerpSpeed);
      currentPos.current.z = THREE.MathUtils.lerp(currentPos.current.z, position[1], delta * lerpSpeed);
      currentPos.current.rot = THREE.MathUtils.lerp(currentPos.current.rot, rotation, delta * lerpSpeed);
      
      groupRef.current.position.x = currentPos.current.x;
      groupRef.current.position.y = currentPos.current.y;
      groupRef.current.position.z = currentPos.current.z;
      groupRef.current.rotation.y = currentPos.current.rot;
      
      lightningPhase.current += delta * 20;
    }
  });
  
  return (
    <group ref={groupRef} position={[position[0], height, position[1]]} rotation={[0, rotation, 0]}>
      {/* Bulbasaur 3D model */}
      <primitive object={model} scale={[0.5, 0.5, 0.5]} position={[0, 0, 0]} rotation={[0, Math.PI, 0]} />
      
      {/* Turbo lightning trail - simplified on mobile */}
      {isTurbo && !isMobile && (
        <>
          {/* Lightning bolts shooting out behind */}
          {[...Array(6)].map((_, i) => {
            const phase = lightningPhase.current + i * 0.5;
            const xOffset = Math.sin(phase * 3 + i) * 0.3;
            const zOffset = -0.8 - i * 0.3 - Math.abs(Math.sin(phase * 2)) * 0.2;
            return (
              <group key={i} position={[xOffset, 0.4 + Math.sin(phase * 4 + i * 2) * 0.2, zOffset]}>
                <mesh rotation={[Math.random() * 0.5, 0, Math.sin(phase + i) * 0.5]}>
                  <boxGeometry args={[0.08, 0.5 + Math.random() * 0.3, 0.02]} />
                  <meshBasicMaterial color="#ffff00" transparent opacity={0.9 - i * 0.1} />
                </mesh>
                <mesh rotation={[Math.random() * 0.5, 0, Math.cos(phase + i) * 0.5]}>
                  <boxGeometry args={[0.06, 0.3 + Math.random() * 0.2, 0.02]} />
                  <meshBasicMaterial color="#00ffff" transparent opacity={0.8 - i * 0.1} />
                </mesh>
              </group>
            );
          })}
          {/* Electric glow around snail */}
          <mesh position={[0, 0.9, 0]}>
            <sphereGeometry args={[1.2, 16, 16]} />
            <meshBasicMaterial color="#ffff00" transparent opacity={0.15 + Math.sin(lightningPhase.current * 5) * 0.05} />
          </mesh>
          <pointLight position={[0, 0.9, -0.5]} color="#ffff00" intensity={2} distance={4} />
        </>
      )}
      {/* Simple turbo indicator on mobile */}
      {isTurbo && isMobile && (
        <mesh position={[0, 0.9, 0]}>
          <sphereGeometry args={[1.0, 8, 8]} />
          <meshBasicMaterial color="#ffff00" transparent opacity={0.2} />
        </mesh>
      )}
      
      {/* Shadow on ground - scales with height, raised to prevent z-fighting */}
      <mesh position={[0, -height + 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1 - height * 0.1, 0.7 - height * 0.07, 1]}>
        <circleGeometry args={[0.6, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={Math.max(0.1, 0.25 - height * 0.05)} depthWrite={false} />
      </mesh>
      
      {/* Gun mounted on right side of snail body - changes based on weapon */}
      <group position={[0.7, 0.5, 0.4]} rotation={[0, 0, 0]}>
        {/* Mount arm connecting to body */}
        <mesh position={[-0.2, 0, -0.1]} rotation={[0, 0.2, 0.1]}>
          <boxGeometry args={[0.3, 0.06, 0.06]} />
          <meshStandardMaterial color="#5a4a3a" roughness={0.85} />
        </mesh>
        
        {specialWeapon === 'flamethrower' ? (
          <>
            {/* Flamethrower barrel */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.08, 0.1, 0.6, 8]} />
              <meshStandardMaterial color="#4a3a2a" metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Fuel tank */}
            <mesh position={[-0.15, 0, -0.2]}>
              <capsuleGeometry args={[0.08, 0.2, 8, 12]} />
              <meshStandardMaterial color="#aa4400" metalness={0.6} roughness={0.4} />
            </mesh>
            {/* Flame tip glow */}
            <pointLight position={[0, 0, 0.4]} color="#ff4400" intensity={1} distance={2} />
          </>
        ) : specialWeapon === 'rocketLauncher' ? (
          <>
            {/* Rocket launcher tube */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.8, 12]} />
              <meshStandardMaterial color="#3a4a3a" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Scope */}
            <mesh position={[0, 0.12, 0]}>
              <boxGeometry args={[0.04, 0.06, 0.15]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
            {/* Back exhaust */}
            <mesh position={[0, 0, -0.45]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.12, 0.08, 0.1, 12]} />
              <meshStandardMaterial color="#2a2a2a" />
            </mesh>
          </>
        ) : specialWeapon === 'shotgun' ? (
          <>
            {/* Shotgun barrels (double barrel) */}
            <mesh position={[0.03, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.7, 8]} />
              <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[-0.03, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.7, 8]} />
              <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Stock */}
            <mesh position={[0, -0.05, -0.35]}>
              <boxGeometry args={[0.08, 0.12, 0.25]} />
              <meshStandardMaterial color="#5a4a3a" roughness={0.8} />
            </mesh>
          </>
        ) : specialWeapon === 'laserBeam' ? (
          <>
            {/* Laser rifle body */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <boxGeometry args={[0.1, 0.6, 0.08]} />
              <meshStandardMaterial color="#2a4a6a" metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Power cell */}
            <mesh position={[0, -0.08, -0.1]}>
              <boxGeometry args={[0.12, 0.06, 0.15]} />
              <meshBasicMaterial color="#00ffff" />
            </mesh>
            {/* Emitter */}
            <mesh position={[0, 0, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.03, 0.05, 0.1, 8]} />
              <meshBasicMaterial color="#00aaff" />
            </mesh>
            <pointLight position={[0, 0, 0.4]} color="#00ffff" intensity={0.8} distance={2} />
          </>
        ) : (
          <>
            {/* Default gun barrel */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.04, 0.06, 0.5, 8]} />
              <meshStandardMaterial color="#2a2a2a" metalness={0.9} roughness={0.15} />
            </mesh>
            {/* Barrel rings */}
            {[0.08, 0.18, 0.28].map((z, i) => (
              <mesh key={i} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.05, 0.008, 6, 12]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.95} roughness={0.05} />
              </mesh>
            ))}
            {/* Muzzle */}
            <mesh position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.055, 0.04, 0.06, 8]} />
              <meshStandardMaterial color="#0a0a0a" metalness={0.95} roughness={0.05} />
            </mesh>
            {/* Receiver/body */}
            <mesh position={[0, 0.03, -0.1]}>
              <boxGeometry args={[0.08, 0.1, 0.15]} />
              <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.25} />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
}

// Realistic bug component - smooth crawling animation
function Bug({ bug }: { bug: Bug }) {
  const config = BUG_CONFIGS[bug.type];
  const s = bug.scale * config.bodyScale;
  const meshRef = useRef<THREE.Group>(null);
  const legPhaseRef = useRef(Math.random() * Math.PI * 2);
  const bodyBobRef = useRef(0);
  const prevPosition = useRef<[number, number, number]>([...bug.position]);
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Smooth rotation towards movement direction
      const dx = bug.velocity[0];
      const dz = bug.velocity[1];
      if (dx !== 0 || dz !== 0) {
        const targetRotation = Math.atan2(dx, dz);
        // Smooth interpolation for rotation
        meshRef.current.rotation.y = THREE.MathUtils.lerp(
          meshRef.current.rotation.y,
          targetRotation,
          delta * 8
        );
      }
      
      // Calculate speed for animation intensity
      const speed = Math.sqrt(dx * dx + dz * dz);
      
      // Smooth leg animation based on speed
      legPhaseRef.current += delta * (8 + speed * 15);
      
      // Body bobbing - subtle up/down motion while moving
      bodyBobRef.current = Math.sin(legPhaseRef.current * 2) * 0.015 * speed;
      meshRef.current.position.y = 0.35 + bodyBobRef.current;
      
      // Smooth position interpolation
      meshRef.current.position.x = THREE.MathUtils.lerp(
        meshRef.current.position.x,
        bug.position[0],
        delta * 12
      );
      meshRef.current.position.z = THREE.MathUtils.lerp(
        meshRef.current.position.z,
        bug.position[2],
        delta * 12
      );
      
      prevPosition.current = [...bug.position];
    }
  });
  
  // Use ref for leg animation in render
  const legWiggle = Math.sin(legPhaseRef.current) * 0.4;
  
  return (
    <group ref={meshRef} position={[bug.position[0], 0.35, bug.position[2]]} scale={[s * 1.5, s * 1.5, s * 1.5]}>
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

// Bullet component - with weapon type variations (optimized - no point lights on bullets)
function Bullet({ bullet }: { bullet: Bullet & { weaponType?: SpecialWeapon } }) {
  if (bullet.weaponType === 'flamethrower') {
    return (
      <group position={bullet.position}>
        <mesh>
          <sphereGeometry args={[0.35, 6, 6]} />
          <meshBasicMaterial color="#ff4400" transparent opacity={0.7} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.2, 6, 6]} />
          <meshBasicMaterial color="#ffaa00" />
        </mesh>
      </group>
    );
  }
  
  if (bullet.weaponType === 'rocketLauncher') {
    return (
      <group position={bullet.position}>
        {/* Rocket body */}
        <mesh rotation={[Math.PI / 2, 0, Math.atan2(bullet.velocity[1], bullet.velocity[0])]}>
          <capsuleGeometry args={[0.15, 0.6, 4, 8]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.8} />
        </mesh>
        {/* Rocket nose cone */}
        <mesh position={[bullet.velocity[0] * 0.5, 0, bullet.velocity[1] * 0.5]} rotation={[Math.PI / 2, 0, Math.atan2(bullet.velocity[1], bullet.velocity[0])]}>
          <coneGeometry args={[0.15, 0.3, 8]} />
          <meshStandardMaterial color="#aa2200" metalness={0.6} />
        </mesh>
        {/* Rocket trail/flame */}
        <mesh position={[-bullet.velocity[0] * 0.4, 0, -bullet.velocity[1] * 0.4]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color="#ff4400" transparent opacity={0.8} />
        </mesh>
        <mesh position={[-bullet.velocity[0] * 0.6, 0, -bullet.velocity[1] * 0.6]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.6} />
        </mesh>
      </group>
    );
  }
  
  if (bullet.weaponType === 'shotgun') {
    return (
      <group position={bullet.position}>
        <mesh rotation={[Math.PI / 2, 0, Math.atan2(bullet.velocity[1], bullet.velocity[0])]}>
          <sphereGeometry args={[0.08, 6, 6]} />
          <meshBasicMaterial color="#888888" />
        </mesh>
      </group>
    );
  }
  
  if (bullet.weaponType === 'laserBeam') {
    return (
      <group position={bullet.position}>
        {/* Laser core */}
        <mesh rotation={[Math.PI / 2, 0, Math.atan2(bullet.velocity[1], bullet.velocity[0])]}>
          <capsuleGeometry args={[0.05, 0.8, 4, 8]} />
          <meshBasicMaterial color="#00ffff" />
        </mesh>
        {/* Laser glow */}
        <mesh rotation={[Math.PI / 2, 0, Math.atan2(bullet.velocity[1], bullet.velocity[0])]}>
          <capsuleGeometry args={[0.12, 0.6, 4, 8]} />
          <meshBasicMaterial color="#00aaff" transparent opacity={0.4} />
        </mesh>
      </group>
    );
  }
  
  return (
    <group position={bullet.position}>
      <mesh rotation={[Math.PI / 2, 0, Math.atan2(bullet.velocity[1], bullet.velocity[0])]}>
        <capsuleGeometry args={[0.15, 0.4, 4, 8]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.2, 6, 6]} />
        <meshBasicMaterial color="#ff3300" />
      </mesh>
    </group>
  );
}

// Explosion effect component - optimized for mobile
function ExplosionEffect({ explosion, isMobile }: { explosion: Explosion; isMobile?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const [progress, setProgress] = useState(0);
  
  useFrame((_, delta) => {
    setProgress(prev => Math.min(prev + delta * 3, 1));
  });
  
  const scale = explosion.scale * (0.5 + progress * 1.5);
  const opacity = 1 - progress;
  
  return (
    <group ref={groupRef} position={explosion.position}>
      {/* Main fireball */}
      <mesh scale={[scale, scale, scale]}>
        <sphereGeometry args={[1, isMobile ? 6 : 16, isMobile ? 6 : 16]} />
        <meshBasicMaterial color="#ff4400" transparent opacity={opacity * 0.8} />
      </mesh>
      {/* Inner hot core */}
      <mesh scale={[scale * 0.6, scale * 0.6, scale * 0.6]}>
        <sphereGeometry args={[1, isMobile ? 4 : 12, isMobile ? 4 : 12]} />
        <meshBasicMaterial color="#ffff00" transparent opacity={opacity} />
      </mesh>
      {/* Outer shockwave - desktop only */}
      {!isMobile && (
        <mesh scale={[scale * 1.5, scale * 0.3, scale * 1.5]} position={[0, 0.1, 0]}>
          <torusGeometry args={[1, 0.3, 8, 24]} />
          <meshBasicMaterial color="#ff6600" transparent opacity={opacity * 0.5} />
        </mesh>
      )}
      {/* Debris particles - fewer on mobile */}
      {[...Array(isMobile ? 3 : 8)].map((_, i) => {
        const angle = (i / (isMobile ? 3 : 8)) * Math.PI * 2;
        const dist = scale * (0.5 + progress);
        return (
          <mesh 
            key={i} 
            position={[
              Math.sin(angle) * dist, 
              0.2 + progress * 2 - (progress * progress * 3), 
              Math.cos(angle) * dist
            ]}
          >
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshBasicMaterial color="#331100" transparent opacity={opacity * 0.7} />
          </mesh>
        );
      })}
    </group>
  );
}

// Bug death explosion (smaller, gorier) - optimized for mobile
function BugExplosion({ position, isMobile }: { position: [number, number, number]; isMobile?: boolean }) {
  const [progress, setProgress] = useState(0);
  
  useFrame((_, delta) => {
    setProgress(prev => Math.min(prev + delta * 4, 1));
  });
  
  if (progress >= 1) return null;
  
  const opacity = 1 - progress;
  const gooCount = isMobile ? 4 : 12;
  const partsCount = isMobile ? 2 : 6;
  
  return (
    <group position={position}>
      {/* Green goo splatter */}
      {[...Array(gooCount)].map((_, i) => {
        const angle = (i / gooCount) * Math.PI * 2 + i * 0.3;
        const dist = progress * (1 + Math.random() * 0.5);
        const yPos = progress * 1.5 - progress * progress * 2;
        return (
          <mesh 
            key={i} 
            position={[
              Math.sin(angle) * dist, 
              0.2 + yPos, 
              Math.cos(angle) * dist
            ]}
            scale={[0.15 - progress * 0.1, 0.15 - progress * 0.1, 0.15 - progress * 0.1]}
          >
            <sphereGeometry args={[1, isMobile ? 4 : 6, isMobile ? 4 : 6]} />
            <meshBasicMaterial color={i % 2 === 0 ? "#4a8a2a" : "#2a5a1a"} transparent opacity={opacity} />
          </mesh>
        );
      })}
      {/* Body parts flying - desktop only */}
      {!isMobile && [...Array(partsCount)].map((_, i) => {
        const angle = (i / partsCount) * Math.PI * 2;
        const dist = progress * 0.8;
        return (
          <mesh 
            key={`part-${i}`} 
            position={[
              Math.sin(angle) * dist, 
              0.3 + progress * 0.5 - progress * progress, 
              Math.cos(angle) * dist
            ]}
            rotation={[progress * 5, progress * 3, 0]}
          >
            <boxGeometry args={[0.08, 0.04, 0.08]} />
            <meshBasicMaterial color="#1a1a0a" transparent opacity={opacity} />
          </mesh>
        );
      })}
    </group>
  );
}


// Weapon pickup component
function WeaponPickupMesh({ pickup }: { pickup: WeaponPickup }) {
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 2;
      meshRef.current.position.y = 0.8 + Math.sin(Date.now() * 0.004) * 0.2;
    }
  });
  
  return (
    <group ref={meshRef} position={[pickup.position[0], pickup.position[1], pickup.position[2]]}>
      {pickup.type === 'flamethrower' && (
        <>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.15, 0.2, 0.8, 8]} />
            <meshStandardMaterial color="#8a4a2a" metalness={0.6} />
          </mesh>
          <mesh position={[0.2, 0.2, 0]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial color="#aa4400" metalness={0.5} />
          </mesh>
          <pointLight color="#ff4400" intensity={1} distance={4} />
          <mesh position={[0, 0, 0.5]}>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshBasicMaterial color="#ff4400" transparent opacity={0.2} />
          </mesh>
        </>
      )}
      {pickup.type === 'rocketLauncher' && (
        <>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.18, 0.18, 1, 12]} />
            <meshStandardMaterial color="#3a5a3a" metalness={0.7} />
          </mesh>
          <mesh position={[0.4, 0.4, 0]}>
            <coneGeometry args={[0.1, 0.25, 8]} />
            <meshStandardMaterial color="#aa2200" />
          </mesh>
          <pointLight color="#44ff44" intensity={0.8} distance={4} />
          <mesh position={[0, 0, 0.5]}>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshBasicMaterial color="#44aa44" transparent opacity={0.2} />
          </mesh>
        </>
      )}
      {pickup.type === 'shotgun' && (
        <>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.08, 0.1, 1.2, 8]} />
            <meshStandardMaterial color="#4a3a2a" metalness={0.7} />
          </mesh>
          <mesh position={[0, -0.3, 0]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.15, 0.4, 0.08]} />
            <meshStandardMaterial color="#5a4a3a" />
          </mesh>
          <pointLight color="#ffaa00" intensity={0.6} distance={3} />
          <mesh position={[0, 0, 0.5]}>
            <sphereGeometry args={[0.35, 16, 16]} />
            <meshBasicMaterial color="#aa8844" transparent opacity={0.2} />
          </mesh>
        </>
      )}
      {pickup.type === 'laserBeam' && (
        <>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.1, 0.15, 0.9, 12]} />
            <meshStandardMaterial color="#2a4a6a" metalness={0.9} />
          </mesh>
          <mesh position={[0.3, 0.3, 0]}>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshBasicMaterial color="#00ffff" />
          </mesh>
          <pointLight color="#00ffff" intensity={1.2} distance={5} />
          <mesh position={[0, 0, 0.5]}>
            <sphereGeometry args={[0.45, 16, 16]} />
            <meshBasicMaterial color="#00aaff" transparent opacity={0.25} />
          </mesh>
        </>
      )}
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
      {powerUp.type === 'turboSpeed' && (
        <>
          {/* Lightning bolt shape */}
          <mesh>
            <octahedronGeometry args={[0.25, 0]} />
            <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.8} />
          </mesh>
          {/* Electric arcs */}
          {[0, 1, 2, 3].map(i => (
            <mesh key={i} position={[Math.sin(i * Math.PI / 2) * 0.3, 0, Math.cos(i * Math.PI / 2) * 0.3]} rotation={[0, i * Math.PI / 2, 0]}>
              <boxGeometry args={[0.08, 0.4, 0.02]} />
              <meshBasicMaterial color="#00ffff" transparent opacity={0.8} />
            </mesh>
          ))}
          <pointLight color="#ffff00" intensity={1.5} distance={5} />
          <mesh>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshBasicMaterial color="#ffff00" transparent opacity={0.15} />
          </mesh>
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

// Rock with collision - uses shared obstacle data
function CollisionRock({ obstacle, variant }: { obstacle: Obstacle; variant: number }) {
  const isMossy = variant % 3 === 0;
  const rockColors = ['#5a5550', '#6a6560', '#7a7570', '#4a4540'];
  const baseColor = rockColors[variant % 4];
  
  return (
    <group position={[obstacle.x, obstacle.height * 0.5, obstacle.z]}>
      {/* Main rock body */}
      <mesh castShadow receiveShadow rotation={[variant * 0.3, variant * 1.2, variant * 0.2]}>
        <icosahedronGeometry args={[obstacle.radius * 0.9, 1]} />
        <meshStandardMaterial color={baseColor} roughness={0.85} flatShading />
      </mesh>
      {/* Secondary rock */}
      <mesh position={[obstacle.radius * 0.4, -obstacle.height * 0.2, obstacle.radius * 0.3]} castShadow>
        <dodecahedronGeometry args={[obstacle.radius * 0.4, 0]} />
        <meshStandardMaterial color={rockColors[(variant + 1) % 4]} roughness={0.9} flatShading />
      </mesh>
      {/* Moss on top */}
      {isMossy && (
        <mesh position={[0, obstacle.height * 0.4, 0]}>
          <sphereGeometry args={[obstacle.radius * 0.5, 6, 4]} />
          <meshStandardMaterial color="#4a7a40" roughness={1} />
        </mesh>
      )}
    </group>
  );
}

// Boulder with collision
function CollisionBoulder({ obstacle, variant }: { obstacle: Obstacle; variant: number }) {
  return (
    <group position={[obstacle.x, obstacle.height * 0.4, obstacle.z]}>
      {/* Main boulder */}
      <mesh castShadow receiveShadow rotation={[variant * 0.2, variant * 0.8, 0]}>
        <icosahedronGeometry args={[obstacle.radius * 0.85, 1]} />
        <meshStandardMaterial color="#7a7570" roughness={0.8} metalness={0.1} flatShading />
      </mesh>
      {/* Detail rocks */}
      <mesh position={[obstacle.radius * 0.5, obstacle.height * 0.2, obstacle.radius * 0.3]} castShadow>
        <octahedronGeometry args={[obstacle.radius * 0.35, 0]} />
        <meshStandardMaterial color="#8a8580" roughness={0.85} flatShading />
      </mesh>
      <mesh position={[-obstacle.radius * 0.4, -obstacle.height * 0.2, -obstacle.radius * 0.2]} castShadow>
        <icosahedronGeometry args={[obstacle.radius * 0.3, 0]} />
        <meshStandardMaterial color="#6a6560" roughness={0.9} flatShading />
      </mesh>
      {/* Crack line */}
      <mesh position={[0, obstacle.height * 0.3, 0]} rotation={[0.2, 0.5, 0.1]}>
        <boxGeometry args={[obstacle.radius * 0.8, 0.02, 0.02]} />
        <meshStandardMaterial color="#3a3530" />
      </mesh>
    </group>
  );
}

// Fallen log with collision
function CollisionLog({ obstacle, variant }: { obstacle: Obstacle; variant: number }) {
  const rotation = seededRandomObstacle(variant + 100) * Math.PI;
  const length = 2 + seededRandomObstacle(variant + 101) * 1.5;
  
  return (
    <group position={[obstacle.x, obstacle.height, obstacle.z]} rotation={[0, rotation, 0]}>
      {/* Main log */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.25, length, 12]} />
        <meshStandardMaterial color="#4a3820" roughness={0.95} />
      </mesh>
      {/* Bark texture rings */}
      <mesh position={[length * 0.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.05, 8]} />
        <meshStandardMaterial color="#3a2810" roughness={1} />
      </mesh>
      {/* Moss */}
      <mesh position={[0, 0.18, 0]} scale={[length * 0.3, 0.1, 0.25]}>
        <sphereGeometry args={[0.5, 6, 4]} />
        <meshStandardMaterial color="#5a8a4a" roughness={1} />
      </mesh>
    </group>
  );
}

// Forest ground with trees, grass, and collidable obstacles
function ForestGround() {
  const isMobile = useIsMobile();
  
  // Pre-computed deterministic positions using seeded pseudo-random
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  // Reduce object counts on mobile for better performance
  const treeCount = isMobile ? 15 : 60;
  const extraTreeCount = isMobile ? 10 : 40;
  const grassCount = isMobile ? 40 : 250;
  const flowerCount = isMobile ? 8 : 30;

  // Generate tree positions deterministically
  const trees = [];
  for (let i = 0; i < treeCount; i++) {
    const seed = i * 1.618;
    const angle = seededRandom(seed) * Math.PI * 2;
    const distance = 18 + seededRandom(seed + 1) * 15;
    const x = Math.sin(angle) * distance;
    const z = Math.cos(angle) * distance;
    trees.push({ x, z, scale: 0.8 + seededRandom(seed + 2) * 0.6, key: i });
  }
  
  // Add more trees scattered around
  for (let i = treeCount; i < treeCount + extraTreeCount; i++) {
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
  for (let i = 0; i < grassCount; i++) {
    const seed = i * 1.618;
    const x = (seededRandom(seed) - 0.5) * 40;
    const z = (seededRandom(seed + 0.5) - 0.5) * 40;
    grass.push({ x, z, key: i, seed });
  }
  
  // Flowers for color
  const flowers = [];
  for (let i = 0; i < flowerCount; i++) {
    const seed = i * 2.345;
    const x = (seededRandom(seed) - 0.5) * 35;
    const z = (seededRandom(seed + 1) - 0.5) * 35;
    const color = ['#ff6b6b', '#ffd93d', '#6bcbff', '#ff9ff3', '#ffffff'][i % 5];
    flowers.push({ x, z, color, key: i });
  }

  return (
    <>
      {/* Main ground - forest floor with gradient */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#3a4a2a" roughness={0.95} />
      </mesh>
      
      {/* Outer ring - darker forest floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <ringGeometry args={[15, 40, 32]} />
        <meshStandardMaterial color="#2a3a1a" roughness={0.95} />
      </mesh>
      
      {/* Middle grass area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[15, 32]} />
        <meshStandardMaterial color="#5a7a45" roughness={0.85} />
      </mesh>
      
      {/* Inner lighter grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
        <circleGeometry args={[10, 24]} />
        <meshStandardMaterial color="#6a8a52" roughness={0.85} />
      </mesh>
      
      {/* Center spawn area - soft dirt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} receiveShadow>
        <circleGeometry args={[4, 16]} />
        <meshStandardMaterial color="#7a6a55" roughness={0.95} />
      </mesh>
      
      {/* Trees */}
      {trees.map((tree) => (
        <Tree key={tree.key} position={[tree.x, 0, tree.z]} scale={tree.scale} />
      ))}
      
      {/* Grass tufts */}
      {grass.map((g) => (
        <GrassTuft key={g.key} position={[g.x, 0, g.z]} seed={g.seed} />
      ))}
      
      {/* Flowers */}
      {flowers.map((f) => (
        <group key={f.key} position={[f.x, 0, f.z]}>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.01, 0.015, 0.2, 4]} />
            <meshStandardMaterial color="#3a5a2a" />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <sphereGeometry args={[0.04, 6, 4]} />
            <meshStandardMaterial color={f.color} />
          </mesh>
        </group>
      ))}
      
      {/* Render collidable obstacles from GAME_OBSTACLES */}
      {GAME_OBSTACLES.map((obs, i) => {
        if (obs.type === 'rock') {
          return <CollisionRock key={`rock-${i}`} obstacle={obs} variant={i} />;
        } else if (obs.type === 'boulder') {
          return <CollisionBoulder key={`boulder-${i}`} obstacle={obs} variant={i} />;
        } else if (obs.type === 'log') {
          return <CollisionLog key={`log-${i}`} obstacle={obs} variant={i} />;
        }
        return null;
      })}
      
      {/* Fog particles for atmosphere - skip on mobile */}
      {!isMobile && [...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const dist = 12 + (i % 3) * 4;
        return (
          <mesh 
            key={`fog-${i}`} 
            position={[Math.sin(angle) * dist, 0.5, Math.cos(angle) * dist]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[6, 6]} />
            <meshBasicMaterial color="#8a9a7a" transparent opacity={0.15} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
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
  touchShooting,
  touchJumping,
  sounds,
  isMobile
}: { 
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  difficulty: Difficulty;
  highScore: number;
  setHighScore: React.Dispatch<React.SetStateAction<number>>;
  touchMove: React.MutableRefObject<{ dx: number; dy: number }>;
  touchShooting: React.MutableRefObject<boolean>;
  touchJumping: React.MutableRefObject<boolean>;
  sounds: ReturnType<typeof useGameSounds>;
  isMobile: boolean;
}) {
  const keysPressed = useRef<Set<string>>(new Set());
  const lastSpawn = useRef(0);
  const lastPowerUpSpawn = useRef(0);
  const lastWeaponSpawn = useRef(0);
  const lastShot = useRef(0);
  const isShooting = useRef(false);
  const jumpPressed = useRef(false);
  
  // Sound tracking refs
  const prevBugsKilled = useRef(0);
  const prevHealth = useRef(100);
  const prevPowerUps = useRef(0);
  const prevWeaponPickups = useRef(0);
  const wasJumping = useRef(false);
  const prevExplosionsCount = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key) || e.shiftKey) {
        e.preventDefault();
      }
      keysPressed.current.add(e.key.toLowerCase());
      if (e.key === ' ') {
        isShooting.current = true;
      }
      if (e.shiftKey) {
        jumpPressed.current = true;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
      if (e.key === ' ') {
        isShooting.current = false;
      }
      if (e.key === 'Shift') {
        jumpPressed.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Sound effects based on state changes
  useEffect(() => {
    // Bug kill sound
    if (gameState.bugsKilled > prevBugsKilled.current) {
      sounds.playBugKill();
    }
    prevBugsKilled.current = gameState.bugsKilled;
    
    // Damage sound
    if (gameState.health < prevHealth.current && gameState.health > 0) {
      sounds.playDamage();
    }
    prevHealth.current = gameState.health;
    
    // Power-up sound
    if (gameState.powerUps.length < prevPowerUps.current) {
      sounds.playPowerUp();
    }
    prevPowerUps.current = gameState.powerUps.length;
    
    // Weapon pickup sound
    if (gameState.weaponPickups.length < prevWeaponPickups.current) {
      sounds.playPowerUp();
    }
    prevWeaponPickups.current = gameState.weaponPickups.length;
    
    // Jump sound
    if (gameState.isJumping && !wasJumping.current) {
      sounds.playJump();
    }
    wasJumping.current = gameState.isJumping;
    
    // Explosion sound
    if (gameState.explosions.length > prevExplosionsCount.current) {
      sounds.playExplosion();
    }
    prevExplosionsCount.current = gameState.explosions.length;
    
    // Game over sound
    if (gameState.status === 'gameover' && gameState.health === 0) {
      sounds.playGameOver();
    }
  }, [gameState.bugsKilled, gameState.health, gameState.powerUps.length, gameState.weaponPickups.length, gameState.isJumping, gameState.status, gameState.explosions.length, sounds]);

  useFrame((_, delta) => {
    if (gameState.status !== 'playing') return;
    
    // Cap delta to prevent huge jumps when tab is inactive
    const clampedDelta = Math.min(delta, 0.05);

    const speedMult = SPEED_MULTIPLIERS[difficulty];
    const moveSpeed = 5 * clampedDelta;
    const rotateSpeed = 1.8 * clampedDelta; // Slower, smoother turning

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

    // Weapon firing - different rates and behaviors based on weapon type
    const now = performance.now();
    const currentWeapon = prev => prev.specialWeaponUntil > now ? prev.specialWeapon : null;
    
    // Determine fire rate based on weapon
    let fireRate = 80; // default machine gun
    if (gameState.specialWeapon === 'flamethrower' && gameState.specialWeaponUntil > now) {
      fireRate = 50; // faster for flamethrower
    } else if (gameState.specialWeapon === 'rocketLauncher' && gameState.specialWeaponUntil > now) {
      fireRate = 500; // slower for rockets
    } else if (gameState.specialWeapon === 'shotgun' && gameState.specialWeaponUntil > now) {
      fireRate = 400; // slower pump action
    } else if (gameState.specialWeapon === 'laserBeam' && gameState.specialWeaponUntil > now) {
      fireRate = 30; // very fast continuous beam
    }
    
    if ((isShooting.current || touchShooting.current) && gameState.status === 'playing' && now - lastShot.current > fireRate) {
      lastShot.current = now;
      const angle = gameState.snailRotation;
      const activeWeapon = gameState.specialWeaponUntil > now ? gameState.specialWeapon : null;
      
      // Calculate gun tip position in world space
      // Gun is at local [0.7, 0.5, 0.8] - 0.7 right, 0.5 up, 0.8 forward (including barrel)
      const gunRightOffset = 0.7;
      const gunForwardOffset = 0.8;
      const gunTipX = gameState.snailPosition[0] + gunRightOffset * Math.cos(angle) + gunForwardOffset * Math.sin(angle);
      const gunTipZ = gameState.snailPosition[1] - gunRightOffset * Math.sin(angle) + gunForwardOffset * Math.cos(angle);
      const gunTipY = 0.5 + gameState.snailHeight;
      
      if (activeWeapon === 'flamethrower') {
        sounds.playFlamethrower();
        // Flamethrower shoots multiple short-range flames
        const spread = (Math.random() - 0.5) * 0.4;
        const velocity: [number, number] = [
          Math.sin(angle + spread) * 0.4,
          Math.cos(angle + spread) * 0.4
        ];
        const newBullet = {
          id: Date.now() + Math.random(),
          position: [gunTipX, gunTipY, gunTipZ] as [number, number, number],
          velocity,
          weaponType: 'flamethrower' as SpecialWeapon
        };
        setGameState(prev => ({
          ...prev,
          bullets: [...prev.bullets, newBullet]
        }));
      } else if (activeWeapon === 'rocketLauncher') {
        sounds.playRocket();
        // Rocket launcher shoots a single powerful rocket
        const velocity: [number, number] = [
          Math.sin(angle) * 0.5,
          Math.cos(angle) * 0.5
        ];
        const newBullet = {
          id: Date.now() + Math.random(),
          position: [gunTipX, gunTipY, gunTipZ] as [number, number, number],
          velocity,
          weaponType: 'rocketLauncher' as SpecialWeapon
        };
        setGameState(prev => ({
          ...prev,
          bullets: [...prev.bullets, newBullet]
        }));
      } else if (activeWeapon === 'shotgun') {
        sounds.playShoot();
        // Shotgun shoots multiple pellets in a spread
        const newBullets: Bullet[] = [];
        for (let i = 0; i < 8; i++) {
          const spread = (i - 3.5) * 0.12;
          const velocity: [number, number] = [
            Math.sin(angle + spread) * 0.9,
            Math.cos(angle + spread) * 0.9
          ];
          newBullets.push({
            id: Date.now() + Math.random() + i,
            position: [gunTipX, gunTipY, gunTipZ],
            velocity,
            weaponType: 'shotgun' as SpecialWeapon
          });
        }
        setGameState(prev => ({
          ...prev,
          bullets: [...prev.bullets, ...newBullets]
        }));
      } else if (activeWeapon === 'laserBeam') {
        sounds.playShoot();
        // Laser beam - fast, accurate, long range
        const velocity: [number, number] = [
          Math.sin(angle) * 1.5,
          Math.cos(angle) * 1.5
        ];
        const newBullet = {
          id: Date.now() + Math.random(),
          position: [gunTipX, gunTipY, gunTipZ] as [number, number, number],
          velocity,
          weaponType: 'laserBeam' as SpecialWeapon
        };
        setGameState(prev => ({
          ...prev,
          bullets: [...prev.bullets, newBullet]
        }));
      } else {
        sounds.playShoot();
        // Default machine gun
        const spread = (Math.random() - 0.5) * 0.15;
        const velocity: [number, number] = [
          Math.sin(angle + spread) * 0.8,
          Math.cos(angle + spread) * 0.8
        ];
        const newBullet: Bullet = {
          id: Date.now() + Math.random(),
          position: [gunTipX, gunTipY, gunTipZ],
          velocity
        };
        setGameState(prev => ({
          ...prev,
          bullets: [...prev.bullets, newBullet]
        }));
      }
    }

    // Spawn bugs - spawn multiple bugs based on difficulty
    if (now - lastSpawn.current > 1800 / speedMult) {
      lastSpawn.current = now;
      const bugTypes: Bug['type'][] = ['beetle', 'centipede', 'spider', 'scorpion', 'wasp'];
      const bugsToSpawn = BUG_SPAWN_COUNTS[difficulty];
      
      const newBugs: Bug[] = [];
      for (let i = 0; i < bugsToSpawn; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 12 + Math.random() * 3;
        newBugs.push({
          id: Date.now() + Math.random() + i,
          position: [
            gameState.snailPosition[0] + Math.sin(angle) * distance,
            0.35,
            gameState.snailPosition[1] + Math.cos(angle) * distance
          ],
          velocity: [0, 0],
          type: bugTypes[Math.floor(Math.random() * bugTypes.length)],
          health: 1,
          scale: 0.8 + Math.random() * 0.6
        });
      }
      setGameState(prev => ({
        ...prev,
        bugs: [...prev.bugs, ...newBugs]
      }));
    }
    
    // Spawn power-ups
    if (now - lastPowerUpSpawn.current > 8000 + Math.random() * 7000) {
      lastPowerUpSpawn.current = now;
      const rand = Math.random();
      const powerUpType: PowerUp['type'] = rand < 0.4 ? 'health' : rand < 0.7 ? 'doubleDamage' : 'turboSpeed';
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
    
    // Spawn weapon pickups
    if (now - lastWeaponSpawn.current > 15000 + Math.random() * 10000) {
      lastWeaponSpawn.current = now;
      const rand = Math.random();
      const weaponType: WeaponPickup['type'] = rand < 0.25 ? 'flamethrower' : rand < 0.5 ? 'rocketLauncher' : rand < 0.75 ? 'shotgun' : 'laserBeam';
      const newWeapon: WeaponPickup = {
        id: Date.now() + Math.random(),
        position: [
          gameState.snailPosition[0] + (Math.random() - 0.5) * 16,
          0.8,
          gameState.snailPosition[1] + (Math.random() - 0.5) * 16
        ],
        type: weaponType
      };
      setGameState(prev => ({
        ...prev,
        weaponPickups: [...prev.weaponPickups, newWeapon]
      }));
    }

    setGameState(prev => {
      // Update rotation
      let newRotation = prev.snailRotation + turn;
      
      // Check if turbo speed is active
      const isTurbo = performance.now() < prev.turboSpeedUntil;
      const speedBoost = isTurbo ? 2.0 : 1.0;
      
      // Calculate proposed new position with turbo boost
      let proposedX = prev.snailPosition[0] + Math.sin(newRotation) * forward * speedBoost;
      let proposedZ = prev.snailPosition[1] + Math.cos(newRotation) * forward * speedBoost;
      
      // Boundary bounce - soft bounce back from edges
      const BOUNDARY = 18;
      let bounced = false;
      if (proposedX > BOUNDARY) {
        proposedX = BOUNDARY - 0.5;
        bounced = true;
      } else if (proposedX < -BOUNDARY) {
        proposedX = -BOUNDARY + 0.5;
        bounced = true;
      }
      if (proposedZ > BOUNDARY) {
        proposedZ = BOUNDARY - 0.5;
        bounced = true;
      } else if (proposedZ < -BOUNDARY) {
        proposedZ = -BOUNDARY + 0.5;
        bounced = true;
      }
      
      // Check obstacle collision
      const collision = checkObstacleCollision(proposedX, proposedZ, prev.snailHeight, GAME_OBSTACLES);
      
      // If blocked by obstacle, try sliding along it
      let newX = proposedX;
      let newZ = proposedZ;
      
      if (collision.blocked) {
        // Try moving only in X direction
        const xOnlyCollision = checkObstacleCollision(proposedX, prev.snailPosition[1], prev.snailHeight, GAME_OBSTACLES);
        // Try moving only in Z direction
        const zOnlyCollision = checkObstacleCollision(prev.snailPosition[0], proposedZ, prev.snailHeight, GAME_OBSTACLES);
        
        if (!xOnlyCollision.blocked) {
          newX = proposedX;
          newZ = prev.snailPosition[1];
        } else if (!zOnlyCollision.blocked) {
          newX = prev.snailPosition[0];
          newZ = proposedZ;
        } else {
          // Completely blocked - stay in place
          newX = prev.snailPosition[0];
          newZ = prev.snailPosition[1];
        }
      }
      
      // Get ground height at final position
      const finalCollision = checkObstacleCollision(newX, newZ, prev.snailHeight, GAME_OBSTACLES);
      const groundLevel = finalCollision.groundHeight;
      
      // Jump physics with variable ground height
      let newHeight = prev.snailHeight;
      let newVelocityY = prev.snailVelocityY;
      let newIsJumping = prev.isJumping;
      
      // Initiate jump (can jump from ground or from on top of obstacle)
      const canJump = !prev.isJumping && (prev.snailHeight <= groundLevel + 0.1);
      if ((jumpPressed.current || touchJumping.current) && canJump) {
        newVelocityY = 8;
        newIsJumping = true;
      }
      
      // Apply gravity and update height
      if (newIsJumping || newHeight > groundLevel) {
        newVelocityY -= 20 * clampedDelta; // gravity
        newHeight += newVelocityY * clampedDelta;
        
        // Land on ground or obstacle
        if (newHeight <= groundLevel) {
          newHeight = groundLevel;
          newVelocityY = 0;
          newIsJumping = false;
        }
      } else {
        // Snap to ground level when walking onto/off obstacles
        newHeight = groundLevel;
      }
      
      // Check weapon pickup collisions
      let newSpecialWeapon = prev.specialWeapon;
      let newSpecialWeaponUntil = prev.specialWeaponUntil;
      let updatedWeaponPickups = prev.weaponPickups.filter(pickup => {
        const dx = pickup.position[0] - newX;
        const dz = pickup.position[2] - newZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < 1.2) {
          newSpecialWeapon = pickup.type;
          newSpecialWeaponUntil = performance.now() + 30000; // 30 seconds
          return false;
        }
        return true;
      });

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

      // Update bugs - roam around terrain with occasional chasing
      let updatedBugs = prev.bugs.map(bug => {
        const dirX = newX - bug.position[0];
        const dirZ = newZ - bug.position[2];
        const dist = Math.sqrt(dirX * dirX + dirZ * dirZ);
        const speed = 1.5 * speedMult * clampedDelta;
        
        // Give each bug a unique behavior based on its ID
        const bugSeed = bug.id % 1000;
        const time = performance.now() * 0.001;
        
        // Roaming pattern with occasional pursuit
        let moveX: number, moveZ: number;
        
        if (dist < 8) {
          // Close to player - chase more aggressively
          moveX = (dirX / dist) * speed * 1.5;
          moveZ = (dirZ / dist) * speed * 1.5;
        } else if (dist < 15) {
          // Medium distance - wander with slight attraction
          const wanderAngle = Math.sin(time * 0.8 + bugSeed) * Math.PI;
          const attraction = 0.3;
          moveX = (Math.sin(wanderAngle) * (1 - attraction) + (dirX / dist) * attraction) * speed;
          moveZ = (Math.cos(wanderAngle) * (1 - attraction) + (dirZ / dist) * attraction) * speed;
        } else {
          // Far away - mostly random wandering
          const wanderAngle = Math.sin(time * 0.5 + bugSeed * 0.1) * Math.PI * 2;
          moveX = Math.sin(wanderAngle) * speed * 0.7;
          moveZ = Math.cos(wanderAngle) * speed * 0.7;
        }
        
        // Keep bugs in bounds
        let newBugX = bug.position[0] + moveX;
        let newBugZ = bug.position[2] + moveZ;
        newBugX = Math.max(-25, Math.min(25, newBugX));
        newBugZ = Math.max(-25, Math.min(25, newBugZ));
        
        return {
          ...bug,
          position: [newBugX, bug.position[1], newBugZ] as [number, number, number],
          velocity: [moveX, moveZ] as [number, number]
        };
      });

      const isDoubleDamage = performance.now() < prev.doubleDamageUntil;
      const damageMultiplier = isDoubleDamage ? 2 : 1;

      // Track new explosions
      let newExplosions: Explosion[] = [...prev.explosions];
      
      // Remove old explosions (older than 500ms)
      const now = performance.now();
      newExplosions = newExplosions.filter(exp => now - exp.createdAt < 500);

      // Check bullet-bug collisions with rocket explosions
      let newScore = prev.score;
      let newBugsKilled = prev.bugsKilled;
      const bugsToRemove = new Set<number>();
      const bulletsToRemove = new Set<number>();
      let snailProtectedByExplosion = false; // Track if snail is in a blast zone
      
      // First pass: check direct hits and create explosions for rockets
      for (let i = 0; i < updatedBullets.length; i++) {
        const b = updatedBullets[i];
        
        for (const bug of updatedBugs) {
          if (bugsToRemove.has(bug.id)) continue;
          
          const dx = bug.position[0] - b.position[0];
          const dz = bug.position[2] - b.position[2];
          const dist = Math.sqrt(dx * dx + dz * dz);
          
          const hitRadius = b.weaponType === 'rocketLauncher' ? 0.8 : 0.5;
          
          if (dist < hitRadius) {
            bulletsToRemove.add(b.id);
            
            if (b.weaponType === 'rocketLauncher') {
              // Create explosion at impact point
              newExplosions.push({
                id: Date.now() + Math.random(),
                position: [b.position[0], 0.5, b.position[2]],
                createdAt: now,
                scale: 2.5
              });
              
              // Area damage - kill all bugs within blast radius
              const blastRadius = 4;
              
              // IMPORTANT: Self-damage protection - check if snail is in blast radius
              const snailToExplosionDist = Math.sqrt(
                Math.pow(newX - b.position[0], 2) + Math.pow(newZ - b.position[2], 2)
              );
              
              // If snail is in blast radius, protect them from bug attacks this frame
              if (snailToExplosionDist < blastRadius) {
                snailProtectedByExplosion = true;
              }
              
              for (const targetBug of updatedBugs) {
                const bdx = targetBug.position[0] - b.position[0];
                const bdz = targetBug.position[2] - b.position[2];
                const blastDist = Math.sqrt(bdx * bdx + bdz * bdz);
                
                if (blastDist < blastRadius && !bugsToRemove.has(targetBug.id)) {
                  bugsToRemove.add(targetBug.id);
                  newScore += 25 * damageMultiplier; // More points for rocket kills
                  newBugsKilled += 1;
                }
              }
            } else {
              // Normal bullet or flamethrower - single target
              bugsToRemove.add(bug.id);
              newScore += 10 * damageMultiplier;
              newBugsKilled += 1;
            }
            break;
          }
        }
      }
      
      // Remove hit bullets and killed bugs
      updatedBullets = updatedBullets.filter(b => !bulletsToRemove.has(b.id));
      updatedBugs = updatedBugs.filter(bug => !bugsToRemove.has(bug.id));

      // Check power-up collisions
      let newHealth = prev.health;
      let newDoubleDamageUntil = prev.doubleDamageUntil;
      let newTurboSpeedUntil = prev.turboSpeedUntil;
      let updatedPowerUps = prev.powerUps.filter(powerUp => {
        const dx = powerUp.position[0] - newX;
        const dz = powerUp.position[2] - newZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < 0.8) {
          if (powerUp.type === 'health') {
            newHealth = Math.min(100, newHealth + 30);
          } else if (powerUp.type === 'doubleDamage') {
            newDoubleDamageUntil = performance.now() + 8000;
          } else if (powerUp.type === 'turboSpeed') {
            newTurboSpeedUntil = performance.now() + 6000; // 6 seconds of turbo
          }
          return false;
        }
        return true;
      });

      // Check bug-snail collisions - bugs attack when close, then get pushed back
      // Skip bug attacks if snail is protected by a nearby explosion (prevents self-damage from rockets)
      updatedBugs = updatedBugs.map(bug => {
        const dx = bug.position[0] - newX;
        const dz = bug.position[2] - newZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        // Bug is close enough to attack - deal damage first, then push
        if (dist < 1.5) {
          const bugAttackCooldown = 600; // ms between attacks
          const lastAttackTime = (bug as any).lastAttackTime || 0;
          
          // Deal damage if within attack range AND snail is NOT protected by explosion
          if (dist < 1.2 && now - lastAttackTime > bugAttackCooldown && !snailProtectedByExplosion) {
            newHealth -= 15;
            // Push bug back after dealing damage
            const pushStrength = 2.0;
            const pushX = dist > 0.01 ? (dx / dist) * pushStrength : (Math.random() - 0.5) * pushStrength;
            const pushZ = dist > 0.01 ? (dz / dist) * pushStrength : (Math.random() - 0.5) * pushStrength;
            return {
              ...bug,
              position: [bug.position[0] + pushX, bug.position[1], bug.position[2] + pushZ] as [number, number, number],
              lastAttackTime: now
            } as Bug & { lastAttackTime: number };
          }
        }
        return bug;
      });

      // Check game over
      if (newHealth <= 0) {
        return {
          ...prev,
          status: 'gameover',
          health: 0,
          score: newScore,
          bugsKilled: newBugsKilled,
          explosions: newExplosions
        };
      }

      newScore += delta * 2;

      return {
        ...prev,
        snailPosition: [newX, newZ],
        snailRotation: newRotation,
        snailHeight: newHeight,
        snailVelocityY: newVelocityY,
        isJumping: newIsJumping,
        bullets: updatedBullets,
        bugs: updatedBugs,
        powerUps: updatedPowerUps,
        weaponPickups: updatedWeaponPickups,
        explosions: newExplosions,
        score: newScore,
        bugsKilled: newBugsKilled,
        health: newHealth,
        doubleDamageUntil: newDoubleDamageUntil,
        turboSpeedUntil: newTurboSpeedUntil,
        specialWeapon: newSpecialWeapon,
        specialWeaponUntil: newSpecialWeaponUntil
      };
    });
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 8, 8]} fov={65} near={0.1} far={150} />
      <ThirdPersonCamera targetPosition={gameState.snailPosition} targetRotation={gameState.snailRotation} />
      
      {/* Realistic lighting and atmosphere */}
      <RealisticLighting />
      <ForestSkybox />
      
      {/* Optimized procedural terrain */}
      <ProceduralTerrain isMobile={isMobile} />
      
      <Snail 
        position={gameState.snailPosition} 
        rotation={gameState.snailRotation} 
        height={gameState.snailHeight}
        specialWeapon={performance.now() < gameState.specialWeaponUntil ? gameState.specialWeapon : null}
        isTurbo={performance.now() < gameState.turboSpeedUntil}
        isMobile={isMobile}
      />
      
      {gameState.bugs.map(bug => (
        <Bug key={bug.id} bug={bug} />
      ))}
      
      {gameState.bullets.map(bullet => (
        <Bullet key={bullet.id} bullet={bullet} />
      ))}
      
      {gameState.powerUps.map(powerUp => (
        <PowerUpMesh key={powerUp.id} powerUp={powerUp} />
      ))}
      
      {gameState.weaponPickups.map(pickup => (
        <WeaponPickupMesh key={pickup.id} pickup={pickup} />
      ))}
      
      {/* Explosions */}
      {gameState.explosions.map(explosion => (
        <ExplosionEffect key={explosion.id} explosion={explosion} isMobile={isMobile} />
      ))}
    </>
  );
}

export const SnailGame3rdPerson = () => {
  const isMobile = useIsMobile();
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [highScore, setHighScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const gameStartTime = useRef<number>(0);
  
  const touchMove = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const touchShooting = useRef(false);
  const touchJumping = useRef(false);
  const joystickRef = useRef<HTMLDivElement>(null);
  const joystickStartPos = useRef<{ x: number; y: number } | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const sounds = useGameSounds();

  const [gameState, setGameState] = useState<GameState>({
    status: 'idle',
    score: 0,
    bugsKilled: 0,
    snailPosition: [0, 0],
    snailRotation: 0,
    snailHeight: 0,
    snailVelocityY: 0,
    isJumping: false,
    bugs: [],
    bullets: [],
    powerUps: [],
    weaponPickups: [],
    explosions: [],
    health: 100,
    doubleDamageUntil: 0,
    turboSpeedUntil: 0,
    specialWeapon: null,
    specialWeaponUntil: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch leaderboard with token rewards
        const { data: leaderboardData, error: leaderboardError } = await supabase
          .from('leaderboard_3d')
          .select('*')
          .order('score', { ascending: false })
          .limit(10);
        
        if (leaderboardError) throw leaderboardError;
        
        // Simple leaderboard without token rewards
        const leaderboardWithTokens = (leaderboardData || []).map(entry => ({
            ...entry,
            tokens_earned: null
        }));
        
        setLeaderboard(leaderboardWithTokens);
        if (leaderboardData && leaderboardData.length > 0) {
          setHighScore(leaderboardData[0].score);
        }

        // Fetch total games played
        const { data: statsData, error: statsError } = await supabase
          .from('game_stats')
          .select('games_played')
          .eq('id', 'global')
          .maybeSingle();
        
        if (!statsError && statsData) {
          setGamesPlayed(statsData.games_played);
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
        .rpc('submit_score_3d', {
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
      
      // Fetch updated leaderboard
      const { data: leaderboardData } = await supabase
        .from('leaderboard_3d')
        .select('*')
        .order('score', { ascending: false })
        .limit(10);
      
      if (leaderboardData) {
        const leaderboardWithTokens = leaderboardData.map(entry => ({
            ...entry,
            tokens_earned: null
        }));
        setLeaderboard(leaderboardWithTokens);
        if (leaderboardData.length > 0) {
          setHighScore(leaderboardData[0].score);
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

  // Generate a stable session hash for rate limiting
  const getSessionHash = useCallback(() => {
    let sessionHash = sessionStorage.getItem('snail_game_session_3d');
    if (!sessionHash) {
      sessionHash = crypto.randomUUID() + '-' + Date.now();
      sessionStorage.setItem('snail_game_session_3d', sessionHash);
    }
    return sessionHash;
  }, []);

  const startGame = useCallback(async () => {
    setScoreSubmitted(false);
    gameStartTime.current = Date.now();
    
    try {
      const sessionHash = getSessionHash();
      const { data: newCount } = await supabase.rpc('increment_games_played', { 
        p_session_hash: sessionHash 
      });
      if (newCount) {
        setGamesPlayed(newCount);
      }
    } catch (error) {
      console.error('Error incrementing games counter:', error);
    }
    
    setGameState({
      status: 'playing',
      score: 0,
      bugsKilled: 0,
      snailPosition: [0, 0],
      snailRotation: 0,
      snailHeight: 0,
      snailVelocityY: 0,
      isJumping: false,
      bugs: [],
      bullets: [],
      powerUps: [],
      weaponPickups: [],
      explosions: [],
      health: 100,
      doubleDamageUntil: 0,
      turboSpeedUntil: 0,
      specialWeapon: null,
      specialWeaponUntil: 0
    });
  }, [getSessionHash]);

  useEffect(() => {
    if (gameState.status === 'gameover' && gameState.health === 0 && !scoreSubmitted) {
      const finalScore = Math.floor(gameState.score);
      if (finalScore > 0 && isHighScore(finalScore)) {
        setGameState(prev => ({ ...prev, status: 'entering_name' }));
      }
    }
  }, [gameState.status, gameState.health, gameState.score, scoreSubmitted]);


  return (
    <section className="py-4 sm:py-12 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-1 sm:mb-2">
          <img src={snailTexture} alt="Snail" className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
          <h2 className="font-display text-xl sm:text-4xl text-center text-primary">
            Snail Shooter 3D!
          </h2>
          <span className="text-xl sm:text-3xl">🎮</span>
        </div>
        <div className="hidden sm:block text-center mb-2">
          <p className="font-body text-base text-muted-foreground">
            <span className="font-semibold text-primary">WASD</span> or <span className="font-semibold text-primary">Arrow Keys</span> to move
            <span className="mx-2">•</span>
            <span className="font-semibold text-primary">SPACE</span> to shoot
            <span className="mx-2">•</span>
            <span className="font-semibold text-primary">SHIFT</span> to jump
          </p>
          <p className="font-body text-sm text-muted-foreground/80">
            Pick up 🔥 Flamethrower or 🚀 Rocket Launcher for special weapons (30 sec)!
          </p>
        </div>
        <p className="sm:hidden font-body text-[10px] text-center text-muted-foreground mb-1">
          Joystick to move • FIRE to shoot • JUMP to jump
        </p>
        <p className="font-display text-[10px] sm:text-sm text-center text-accent mb-2 sm:mb-4">
          🎮 {gamesPlayed.toLocaleString()} games played!
        </p>


        {/* Game area - taller for 3rd person view */}
        <div 
          ref={gameContainerRef}
          className="relative overflow-hidden bg-black w-full rounded-xl sm:rounded-2xl retro-border"
          style={{ 
            aspectRatio: '16 / 9',
            minHeight: '180px',
            maxHeight: 'min(calc(100dvh - 180px), 500px)'
          }}
        >

          {/* Mute/Unmute button */}
          <button
            onClick={() => {
              const newMuted = !isMuted;
              setIsMuted(newMuted);
              sounds.setMuted(newMuted);
            }}
            className="absolute z-50 p-2 rounded-lg border text-white transition-colors top-2 right-2 bg-black/60 hover:bg-black/80 border-white/30"
            aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <Canvas
            shadows={!isMobile}
            dpr={isMobile ? [0.5, 1] : [1, 1.5]}
            frameloop="always"
            gl={{ 
              antialias: false,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.1,
              powerPreference: isMobile ? 'low-power' : 'high-performance'
            }}
            camera={{ fov: 65 }}
          >
            <GameScene 
              gameState={gameState} 
              setGameState={setGameState} 
              difficulty={difficulty}
              highScore={highScore}
              setHighScore={setHighScore}
              touchMove={touchMove}
              touchShooting={touchShooting}
              touchJumping={touchJumping}
              sounds={sounds}
              isMobile={isMobile}
            />
          </Canvas>

          {/* HUD */}
          {(gameState.status === 'playing' || gameState.status === 'paused') && (
            <div className="absolute top-0 left-0 right-0 p-2 sm:p-3 pr-12 sm:pr-14">
              {/* Mobile: Simplified compact HUD */}
              <div className="sm:hidden">
                <div className="flex justify-between items-center gap-2">
                  {/* Health bar - compact */}
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-red-500 text-sm">❤️</span>
                    <div className="flex-1 max-w-20 h-3 bg-black/50 rounded-full overflow-hidden border border-white/20">
                      <div 
                        className="h-full transition-all duration-200"
                        style={{ 
                          width: `${gameState.health}%`,
                          background: gameState.health > 50 
                            ? '#22c55e' 
                            : gameState.health > 25 ? '#eab308' : '#dc2626'
                        }}
                      />
                    </div>
                  </div>
                  {/* Score */}
                  <span className="bg-black/40 px-2 py-0.5 rounded text-white font-display text-xs">
                    {Math.floor(gameState.score)}
                  </span>
                  {/* Pause */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGameState(prev => ({ 
                      ...prev, 
                      status: prev.status === 'paused' ? 'playing' : 'paused' 
                    }))}
                    className="font-display bg-black/40 border-white/30 text-white hover:bg-black/60 px-2 py-1 h-auto text-xs"
                  >
                    {gameState.status === 'paused' ? '▶️' : '⏸️'}
                  </Button>
                </div>
                {/* Weapon indicator on mobile */}
                {gameState.specialWeaponUntil > performance.now() && gameState.specialWeapon && (
                  <div className={`mt-1 px-2 py-0.5 rounded text-center text-xs ${
                    gameState.specialWeapon === 'flamethrower' ? 'bg-orange-600/80' : 'bg-green-600/80'
                  }`}>
                    <span className="text-white font-display">
                      {gameState.specialWeapon === 'flamethrower' ? '🔥' : '🚀'}
                      {' '}({Math.ceil((gameState.specialWeaponUntil - performance.now()) / 1000)}s)
                    </span>
                  </div>
                )}
              </div>
              
              {/* Desktop: Full HUD */}
              <div className="hidden sm:block">
                {/* Top row - Difficulty buttons */}
                <div className="flex justify-center gap-2 mb-2">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                    <Button
                      key={d}
                      variant={difficulty === d ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDifficulty(d)}
                      className={`font-display text-xs px-3 py-1 ${
                        difficulty === d 
                          ? d === 'easy' ? 'bg-green-600 hover:bg-green-700' 
                            : d === 'medium' ? 'bg-yellow-600 hover:bg-yellow-700'
                            : 'bg-red-600 hover:bg-red-700'
                          : 'bg-black/40 border-white/30 text-white hover:bg-black/60'
                      }`}
                    >
                      {DIFFICULTY_LABELS[d]}
                    </Button>
                  ))}
                </div>
                
                {/* Second row - Health, Score, Pause */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 pointer-events-none">
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
                      <div className="bg-orange-500/80 px-2 py-1 rounded-lg animate-pulse pointer-events-none">
                        <span className="text-white font-display text-xs">⚡2X DAMAGE⚡</span>
                      </div>
                    )}
                    {gameState.specialWeaponUntil > performance.now() && gameState.specialWeapon && (
                      <div className={`px-2 py-1 rounded-lg pointer-events-none ${
                        gameState.specialWeapon === 'flamethrower' ? 'bg-orange-600/80' : 'bg-green-600/80'
                      }`}>
                        <span className="text-white font-display text-xs">
                          {gameState.specialWeapon === 'flamethrower' ? '🔥 FLAMETHROWER' : '🚀 ROCKET'}
                          {' '}({Math.ceil((gameState.specialWeaponUntil - performance.now()) / 1000)}s)
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-4 font-display text-white drop-shadow-lg pointer-events-none">
                      <span className="bg-black/40 px-3 py-1 rounded-lg">
                        Score: <span className="text-yellow-400">{Math.floor(gameState.score)}</span>
                      </span>
                      <span className="bg-black/40 px-3 py-1 rounded-lg">
                        💀 <span className="text-red-400">{gameState.bugsKilled}</span>
                      </span>
                    </div>
                    {/* Pause button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGameState(prev => ({ 
                        ...prev, 
                        status: prev.status === 'paused' ? 'playing' : 'paused' 
                      }))}
                      className="font-display bg-black/40 border-white/30 text-white hover:bg-black/60"
                    >
                      {gameState.status === 'paused' ? '▶️ Resume' : '⏸️ Pause'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Pause overlay */}
          {gameState.status === 'paused' && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center p-4">
              <h3 className="font-display text-3xl text-primary mb-4">PAUSED</h3>
              <div className="flex gap-3">
                <Button 
                  onClick={() => setGameState(prev => ({ ...prev, status: 'playing' }))}
                  className="font-display"
                >
                  ▶️ Resume
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setGameState(prev => ({ ...prev, status: 'gameover' }))}
                  className="font-display"
                >
                  🚪 Quit
                </Button>
              </div>
            </div>
          )}
          
          {/* Mobile Controls */}
          {gameState.status === 'playing' && (
            <>
              <div
                ref={joystickRef}
                className="absolute bottom-2 left-2 w-20 h-20 sm:hidden touch-none"
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
                <div className="w-full h-full rounded-full bg-black/50 border-2 border-white/40 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-white/60 border-2 border-white/80" />
                </div>
              </div>
              
              {/* Right side buttons - Jump and Fire next to each other */}
              <div className="absolute bottom-2 right-2 flex gap-2 sm:hidden">
                {/* Jump button */}
                <div
                  className="w-14 h-14 touch-none"
                  onTouchStart={() => {
                    touchJumping.current = true;
                  }}
                  onTouchEnd={() => {
                    touchJumping.current = false;
                  }}
                >
                  <div className="w-full h-full rounded-full bg-blue-600/80 border-2 border-blue-400 flex items-center justify-center active:bg-blue-500 active:scale-95 transition-transform">
                    <span className="text-white font-display text-[10px]">JUMP</span>
                  </div>
                </div>
                
                {/* Fire button */}
                <div
                  className="w-14 h-14 touch-none"
                  onTouchStart={() => {
                    touchShooting.current = true;
                  }}
                  onTouchEnd={() => {
                    touchShooting.current = false;
                  }}
                >
                  <div className="w-full h-full rounded-full bg-red-600/80 border-2 border-red-400 flex items-center justify-center active:bg-red-500 active:scale-95 transition-transform">
                    <span className="text-white font-display text-[10px]">FIRE</span>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {/* Overlays */}
          {gameState.status === 'idle' && (
            <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center p-1 sm:p-4 overflow-y-auto">
              <img src={snailTexture} alt="Snail" className="w-8 h-8 sm:w-20 sm:h-20 object-contain mb-0.5 sm:mb-2" />
              <h3 className="font-display text-base sm:text-2xl text-primary mb-1 sm:mb-4">3rd Person Mode</h3>
              
              <p className="font-body text-[10px] sm:text-sm text-muted-foreground mb-0.5 sm:mb-2">Difficulty:</p>
              <div className="flex gap-1 sm:gap-2 mb-1 sm:mb-4">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                  <Button
                    key={d}
                    variant={difficulty === d ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDifficulty(d)}
                    className={`font-display text-[10px] sm:text-sm px-1.5 sm:px-3 py-0.5 sm:py-1 h-6 sm:h-auto ${
                      difficulty === d 
                        ? d === 'easy' ? 'bg-green-600 hover:bg-green-700' 
                          : d === 'medium' ? 'bg-yellow-600 hover:bg-yellow-700'
                          : 'bg-red-600 hover:bg-red-700'
                        : ''
                    }`}
                  >
                    {DIFFICULTY_LABELS[d]}
                  </Button>
                ))}
              </div>
              
              <Button onClick={startGame} size="sm" className="font-display text-xs sm:text-lg px-3 sm:px-8 h-8 sm:h-11">
                🎮 START GAME
              </Button>
            </div>
          )}

          {gameState.status === 'entering_name' && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-2 sm:p-4">
              <h3 className="font-display text-lg sm:text-2xl text-yellow-400 mb-1 sm:mb-2">🏆 HIGH SCORE!</h3>
              <p className="font-display text-xl sm:text-3xl text-primary mb-2 sm:mb-4">{Math.floor(gameState.score)}</p>
              <p className="font-body text-xs sm:text-base text-muted-foreground mb-2 sm:mb-4">Enter your name for the leaderboard:</p>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Your name"
                maxLength={50}
                className="w-36 sm:w-48 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 border-primary bg-background text-foreground font-display text-center text-sm sm:text-base mb-2 sm:mb-4"
                onKeyDown={(e) => e.key === 'Enter' && submitScore()}
              />
              <div className="flex gap-2">
                <Button onClick={submitScore} size="sm" className="font-display text-xs sm:text-sm">
                  Submit Score
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setScoreSubmitted(true);
                    setGameState(prev => ({ ...prev, status: 'gameover' }));
                  }}
                  className="font-display text-xs sm:text-sm"
                >
                  Skip
                </Button>
              </div>
            </div>
          )}

          {gameState.status === 'gameover' && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-2 sm:p-4 overflow-y-auto">
              <h3 className="font-display text-xl sm:text-3xl text-destructive mb-1 sm:mb-2">GAME OVER</h3>
              <p className="font-display text-base sm:text-xl text-primary mb-0.5 sm:mb-1">Score: {Math.floor(gameState.score)}</p>
              <p className="font-body text-xs sm:text-base text-muted-foreground mb-2 sm:mb-4">Bugs Killed: {gameState.bugsKilled}</p>
              
              <Button onClick={startGame} size="default" className="font-display text-xs sm:text-base">
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
              {/* Header */}
              <div className="flex justify-between items-center px-3 py-1 text-xs text-muted-foreground border-b border-border/50">
                <span className="flex-1">Player</span>
                <span className="w-20 text-right">Points</span>
                <span className="w-24 text-right">Tokens</span>
              </div>
              {leaderboard.slice(0, 5).map((entry, index) => (
                <div 
                  key={entry.id} 
                  className={`flex justify-between items-center px-3 py-2 rounded-lg ${
                    index === 0 ? 'bg-yellow-500/20' : 
                    index === 1 ? 'bg-gray-400/20' : 
                    index === 2 ? 'bg-orange-600/20' : 'bg-muted/30'
                  }`}
                >
                  <span className="font-display text-sm flex-1 truncate">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    {' '}{entry.name}
                  </span>
                  <span className="font-display text-accent w-20 text-right">{entry.score}</span>
                  <span className={`font-display w-24 text-right ${entry.tokens_earned ? 'text-green-400' : 'text-muted-foreground'}`}>
                    {entry.tokens_earned ? `${Math.floor(entry.tokens_earned)} 🐌` : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default SnailGame3rdPerson;
