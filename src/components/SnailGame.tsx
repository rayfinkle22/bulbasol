import { useState, useEffect, useCallback, useRef } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import * as THREE from "three";
import { TextureLoader } from "three";
import snailTexture from "@/assets/snail-game.png";

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

interface GameState {
  status: 'idle' | 'playing' | 'gameover';
  score: number;
  bugsKilled: number;
  snailPosition: [number, number];
  snailRotation: number;
  bugs: Bug[];
  bullets: Bullet[];
  health: number;
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

// 3D Snail component with texture sprite and attached gun
function Snail({ position, rotation }: { position: [number, number]; rotation: number }) {
  const texture = useLoader(TextureLoader, snailTexture);
  
  return (
    <group position={[position[0], 0.5, position[1]]} rotation={[0, rotation, 0]}>
      {/* Snail sprite - slightly back */}
      <sprite scale={[1.4, 1.4, 1]} position={[0, 0.1, 0]}>
        <spriteMaterial map={texture} transparent />
      </sprite>
      
      {/* Gun mount/strap connecting to snail */}
      <mesh position={[0.3, 0, 0]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[0.4, 0.06, 0.08]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.8} />
      </mesh>
      
      {/* Machine gun - attached via strap */}
      <group position={[0.6, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        {/* Main barrel */}
        <mesh>
          <cylinderGeometry args={[0.07, 0.09, 0.7, 12]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Barrel ridges */}
        {[0.1, 0.2, 0.3].map((y, i) => (
          <mesh key={i} position={[0, y, 0]}>
            <torusGeometry args={[0.08, 0.015, 8, 16]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.95} roughness={0.05} />
          </mesh>
        ))}
        {/* Muzzle */}
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.1, 0.07, 0.12, 12]} />
          <meshStandardMaterial color="#0a0a0a" metalness={0.95} roughness={0.05} />
        </mesh>
        {/* Body/receiver */}
        <mesh position={[0, -0.15, -0.08]}>
          <boxGeometry args={[0.14, 0.3, 0.16]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Magazine */}
        <mesh position={[0, -0.1, -0.18]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.1, 0.22, 0.08]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

// Scary Bug component with varied shapes
function Bug({ bug }: { bug: Bug }) {
  const config = BUG_CONFIGS[bug.type];
  const s = bug.scale * config.bodyScale;
  const meshRef = useRef<THREE.Group>(null);
  
  // Slight wobble animation
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 2;
    }
  });
  
  return (
    <group position={bug.position} ref={meshRef} scale={[s, s, s]}>
      {bug.type === 'beetle' && (
        <>
          {/* Armored body */}
          <mesh>
            <dodecahedronGeometry args={[0.3, 0]} />
            <meshStandardMaterial color={config.color} metalness={0.3} roughness={0.7} />
          </mesh>
          {/* Pincers */}
          <mesh position={[0.25, 0, 0.15]} rotation={[0, 0.3, 0]}>
            <coneGeometry args={[0.08, 0.25, 4]} />
            <meshStandardMaterial color="#1a0000" />
          </mesh>
          <mesh position={[0.25, 0, -0.15]} rotation={[0, -0.3, 0]}>
            <coneGeometry args={[0.08, 0.25, 4]} />
            <meshStandardMaterial color="#1a0000" />
          </mesh>
        </>
      )}
      
      {bug.type === 'centipede' && (
        <>
          {/* Segmented body */}
          {[0, 0.2, 0.4, -0.2, -0.4].map((x, i) => (
            <mesh key={i} position={[x, 0, 0]}>
              <sphereGeometry args={[0.15, 8, 8]} />
              <meshStandardMaterial color={config.color} />
            </mesh>
          ))}
          {/* Many legs */}
          {[-0.4, -0.2, 0, 0.2, 0.4].map((x, i) => (
            <group key={i}>
              <mesh position={[x, -0.1, 0.2]} rotation={[0.5, 0, 0]}>
                <cylinderGeometry args={[0.015, 0.015, 0.2, 4]} />
                <meshStandardMaterial color="#2a0a1a" />
              </mesh>
              <mesh position={[x, -0.1, -0.2]} rotation={[-0.5, 0, 0]}>
                <cylinderGeometry args={[0.015, 0.015, 0.2, 4]} />
                <meshStandardMaterial color="#2a0a1a" />
              </mesh>
            </group>
          ))}
        </>
      )}
      
      {bug.type === 'spider' && (
        <>
          {/* Bulbous body */}
          <mesh>
            <sphereGeometry args={[0.2, 12, 12]} />
            <meshStandardMaterial color={config.color} />
          </mesh>
          <mesh position={[0.15, 0.05, 0]}>
            <sphereGeometry args={[0.12, 10, 10]} />
            <meshStandardMaterial color={config.color} />
          </mesh>
          {/* 8 spindly legs */}
          {[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((angle, i) => (
            <mesh key={i} position={[Math.cos(angle * Math.PI) * 0.15, -0.05, Math.sin(angle * Math.PI) * 0.15]} rotation={[Math.sin(angle) * 0.5, 0, Math.cos(angle) * 0.5]}>
              <cylinderGeometry args={[0.01, 0.02, 0.35, 4]} />
              <meshStandardMaterial color="#0a0a0a" />
            </mesh>
          ))}
        </>
      )}
      
      {bug.type === 'scorpion' && (
        <>
          {/* Body */}
          <mesh>
            <boxGeometry args={[0.35, 0.12, 0.2]} />
            <meshStandardMaterial color={config.color} />
          </mesh>
          {/* Tail segments */}
          {[0.25, 0.4, 0.5, 0.55].map((x, i) => (
            <mesh key={i} position={[-x, 0.1 + i * 0.08, 0]}>
              <sphereGeometry args={[0.06 - i * 0.01, 6, 6]} />
              <meshStandardMaterial color={config.color} />
            </mesh>
          ))}
          {/* Stinger */}
          <mesh position={[-0.6, 0.45, 0]} rotation={[0, 0, -0.5]}>
            <coneGeometry args={[0.04, 0.15, 6]} />
            <meshStandardMaterial color="#ff3300" emissive="#ff0000" emissiveIntensity={0.5} />
          </mesh>
          {/* Claws */}
          <mesh position={[0.25, 0, 0.15]}>
            <boxGeometry args={[0.15, 0.08, 0.1]} />
            <meshStandardMaterial color={config.color} />
          </mesh>
          <mesh position={[0.25, 0, -0.15]}>
            <boxGeometry args={[0.15, 0.08, 0.1]} />
            <meshStandardMaterial color={config.color} />
          </mesh>
        </>
      )}
      
      {bug.type === 'wasp' && (
        <>
          {/* Striped body */}
          <mesh>
            <capsuleGeometry args={[0.1, 0.25, 6, 12]} />
            <meshStandardMaterial color="#1a1a00" />
          </mesh>
          <mesh position={[0, 0, 0]} scale={[1.05, 0.3, 1.05]}>
            <torusGeometry args={[0.1, 0.03, 6, 12]} />
            <meshStandardMaterial color="#ffcc00" />
          </mesh>
          {/* Wings */}
          <mesh position={[0, 0.15, 0.12]} rotation={[0.3, 0, 0]}>
            <planeGeometry args={[0.15, 0.25]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.15, -0.12]} rotation={[-0.3, 0, 0]}>
            <planeGeometry args={[0.15, 0.25]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
          {/* Stinger */}
          <mesh position={[-0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.03, 0.12, 6]} />
            <meshStandardMaterial color="#1a0a00" />
          </mesh>
        </>
      )}
      
      {/* Glowing eyes for all bugs */}
      <mesh position={[0.2, 0.08, 0.06]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={1} />
      </mesh>
      <mesh position={[0.2, 0.08, -0.06]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={1} />
      </mesh>
    </group>
  );
}

// Bullet component (machine gun rounds)
function Bullet({ bullet }: { bullet: Bullet }) {
  return (
    <group position={bullet.position}>
      {/* Bullet tracer */}
      <mesh rotation={[Math.PI / 2, 0, Math.atan2(bullet.velocity[1], bullet.velocity[0])]}>
        <capsuleGeometry args={[0.04, 0.15, 4, 8]} />
        <meshStandardMaterial color="#ffcc00" emissive="#ff8800" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

// Atmospheric ground with dark swamp feel
function Ground() {
  return (
    <>
      {/* Main ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#1a2a1a" />
      </mesh>
      {/* Darker patches */}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh 
          key={i}
          rotation={[-Math.PI / 2, 0, Math.random() * Math.PI]} 
          position={[(Math.random() - 0.5) * 25, 0.01, (Math.random() - 0.5) * 25]}
        >
          <circleGeometry args={[0.5 + Math.random() * 1.5, 8]} />
          <meshStandardMaterial color="#0a1a0a" transparent opacity={0.6} />
        </mesh>
      ))}
    </>
  );
}

// Spooky environment decorations
function SpookyEnvironment() {
  const decorations = useRef<{ pos: [number, number, number]; type: string; rot: number }[]>([]);
  
  if (decorations.current.length === 0) {
    // Dead trees/stumps
    for (let i = 0; i < 15; i++) {
      decorations.current.push({
        pos: [(Math.random() - 0.5) * 22, 0, (Math.random() - 0.5) * 22],
        type: Math.random() > 0.5 ? 'stump' : 'rock',
        rot: Math.random() * Math.PI * 2
      });
    }
    // Bones scattered
    for (let i = 0; i < 10; i++) {
      decorations.current.push({
        pos: [(Math.random() - 0.5) * 20, 0.02, (Math.random() - 0.5) * 20],
        type: 'bone',
        rot: Math.random() * Math.PI * 2
      });
    }
    // Mushrooms (toxic looking)
    for (let i = 0; i < 12; i++) {
      decorations.current.push({
        pos: [(Math.random() - 0.5) * 18, 0, (Math.random() - 0.5) * 18],
        type: 'mushroom',
        rot: Math.random() * Math.PI * 2
      });
    }
  }
  
  return (
    <>
      {decorations.current.map((dec, i) => (
        <group key={i} position={dec.pos} rotation={[0, dec.rot, 0]}>
          {dec.type === 'stump' && (
            <>
              <mesh position={[0, 0.15, 0]}>
                <cylinderGeometry args={[0.2, 0.25, 0.3, 8]} />
                <meshStandardMaterial color="#2a1a0a" roughness={1} />
              </mesh>
              <mesh position={[0.1, 0.35, 0]} rotation={[0, 0, 0.5]}>
                <cylinderGeometry args={[0.03, 0.05, 0.2, 5]} />
                <meshStandardMaterial color="#1a0a00" />
              </mesh>
            </>
          )}
          {dec.type === 'rock' && (
            <mesh position={[0, 0.1, 0]}>
              <dodecahedronGeometry args={[0.15 + Math.random() * 0.1, 0]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
            </mesh>
          )}
          {dec.type === 'bone' && (
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <capsuleGeometry args={[0.03, 0.15, 4, 8]} />
              <meshStandardMaterial color="#d4c5a9" />
            </mesh>
          )}
          {dec.type === 'mushroom' && (
            <>
              <mesh position={[0, 0.08, 0]}>
                <cylinderGeometry args={[0.02, 0.03, 0.1, 6]} />
                <meshStandardMaterial color="#8a7a6a" />
              </mesh>
              <mesh position={[0, 0.15, 0]}>
                <sphereGeometry args={[0.08, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#7a0a2a" emissive="#3a0010" emissiveIntensity={0.3} />
              </mesh>
              {/* Toxic spots */}
              <mesh position={[0.04, 0.17, 0.02]}>
                <sphereGeometry args={[0.015, 4, 4]} />
                <meshStandardMaterial color="#ffff00" emissive="#aaaa00" emissiveIntensity={0.5} />
              </mesh>
            </>
          )}
        </group>
      ))}
      
      {/* Fog particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh 
          key={`fog-${i}`}
          position={[(Math.random() - 0.5) * 15, 0.3, (Math.random() - 0.5) * 15]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[1 + Math.random(), 8]} />
          <meshStandardMaterial color="#2a4a2a" transparent opacity={0.15} />
        </mesh>
      ))}
    </>
  );
}

// Game logic component
function GameScene({ 
  gameState, 
  setGameState, 
  difficulty,
  highScore,
  setHighScore 
}: { 
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  difficulty: Difficulty;
  highScore: number;
  setHighScore: React.Dispatch<React.SetStateAction<number>>;
}) {
  const keysPressed = useRef<Set<string>>(new Set());
  const lastSpawn = useRef(0);
  const lastShot = useRef(0);
  const isShooting = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent arrow keys and space from scrolling page
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
    const moveSpeed = 4 * delta;
    const rotateSpeed = 3 * delta;

    let dx = 0, dz = 0, dr = 0;
    
    if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) {
      dx += Math.sin(gameState.snailRotation) * moveSpeed;
      dz += Math.cos(gameState.snailRotation) * moveSpeed;
    }
    if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) {
      dx -= Math.sin(gameState.snailRotation) * moveSpeed;
      dz -= Math.cos(gameState.snailRotation) * moveSpeed;
    }
    if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) {
      dr += rotateSpeed;
    }
    if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) {
      dr -= rotateSpeed;
    }

    // Machine gun firing (hold space)
    const now = performance.now();
    if (isShooting.current && gameState.status === 'playing' && now - lastShot.current > 80) {
      lastShot.current = now;
      const angle = gameState.snailRotation;
      const spread = (Math.random() - 0.5) * 0.15; // slight spread
      const velocity: [number, number] = [
        Math.sin(angle + spread) * 0.6,
        Math.cos(angle + spread) * 0.6
      ];
      const newBullet: Bullet = {
        id: Date.now() + Math.random(),
        position: [
          gameState.snailPosition[0] + Math.sin(angle) * 0.7,
          0.4,
          gameState.snailPosition[1] + Math.cos(angle) * 0.7
        ],
        velocity
      };
      setGameState(prev => ({
        ...prev,
        bullets: [...prev.bullets, newBullet]
      }));
    }

    // Spawn bugs with variety
    if (now - lastSpawn.current > 2000 / speedMult) {
      lastSpawn.current = now;
      const angle = Math.random() * Math.PI * 2;
      const distance = 8 + Math.random() * 2;
      const bugTypes: Bug['type'][] = ['beetle', 'centipede', 'spider', 'scorpion', 'wasp'];
      const newBug: Bug = {
        id: Date.now() + Math.random(),
        position: [
          Math.sin(angle) * distance,
          0.25,
          Math.cos(angle) * distance
        ],
        velocity: [0, 0],
        type: bugTypes[Math.floor(Math.random() * bugTypes.length)],
        health: 1,
        scale: 0.7 + Math.random() * 0.8 // Varied sizes
      };
      setGameState(prev => ({
        ...prev,
        bugs: [...prev.bugs, newBug]
      }));
    }

    setGameState(prev => {
      // Update snail position
      let newX = prev.snailPosition[0] + dx;
      let newZ = prev.snailPosition[1] + dz;
      newX = Math.max(-9, Math.min(9, newX));
      newZ = Math.max(-9, Math.min(9, newZ));
      
      const newRotation = prev.snailRotation + dr;

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
          Math.abs(b.position[0]) < 12 && 
          Math.abs(b.position[2]) < 12
        );

      // Update bugs - move toward snail
      let updatedBugs = prev.bugs.map(bug => {
        const dirX = newX - bug.position[0];
        const dirZ = newZ - bug.position[2];
        const dist = Math.sqrt(dirX * dirX + dirZ * dirZ);
        const speed = 1.5 * speedMult * delta;
        
        return {
          ...bug,
          position: [
            bug.position[0] + (dirX / dist) * speed,
            bug.position[1],
            bug.position[2] + (dirZ / dist) * speed
          ] as [number, number, number]
        };
      });

      // Check bullet-bug collisions
      let newScore = prev.score;
      let newBugsKilled = prev.bugsKilled;
      
      updatedBugs = updatedBugs.filter(bug => {
        for (let i = updatedBullets.length - 1; i >= 0; i--) {
          const b = updatedBullets[i];
          const dx = bug.position[0] - b.position[0];
          const dz = bug.position[2] - b.position[2];
          const dist = Math.sqrt(dx * dx + dz * dz);
          
          if (dist < 0.4) {
            updatedBullets.splice(i, 1);
            newScore += 10;
            newBugsKilled += 1;
            return false;
          }
        }
        return true;
      });

      // Check bug-snail collisions
      let newHealth = prev.health;
      updatedBugs = updatedBugs.filter(bug => {
        const dx = bug.position[0] - newX;
        const dz = bug.position[2] - newZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < 0.6) {
          newHealth -= 20;
          return false;
        }
        return true;
      });

      // Check game over
      if (newHealth <= 0) {
        if (newScore > highScore) {
          setHighScore(newScore);
          localStorage.setItem('snail-shooter-highscore', newScore.toString());
        }
        return {
          ...prev,
          status: 'gameover',
          health: 0,
          score: newScore,
          bugsKilled: newBugsKilled
        };
      }

      // Add survival score
      newScore += delta * 2;

      return {
        ...prev,
        snailPosition: [newX, newZ],
        snailRotation: newRotation,
        bullets: updatedBullets,
        bugs: updatedBugs,
        score: newScore,
        bugsKilled: newBugsKilled,
        health: newHealth
      };
    });
  });

  return (
    <>
      <OrthographicCamera makeDefault position={[0, 15, 0]} zoom={45} rotation={[-Math.PI / 2, 0, 0]} />
      
      {/* Atmospheric lighting */}
      <ambientLight intensity={0.3} color="#4a6a4a" />
      <directionalLight position={[5, 10, 5]} intensity={0.6} color="#aaffaa" castShadow />
      <directionalLight position={[-5, 8, -5]} intensity={0.3} color="#ff6644" />
      <pointLight position={[0, 3, 0]} intensity={0.5} color="#ffaa44" distance={15} />
      
      {/* Fog effect */}
      <fog attach="fog" args={['#1a2a1a', 8, 20]} />
      
      <Ground />
      <SpookyEnvironment />
      
      <Snail position={gameState.snailPosition} rotation={gameState.snailRotation} />
      
      {gameState.bugs.map(bug => (
        <Bug key={bug.id} bug={bug} />
      ))}
      
      {gameState.bullets.map(bullet => (
        <Bullet key={bullet.id} bullet={bullet} />
      ))}
    </>
  );
}

export const SnailGame = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snail-shooter-highscore');
    return saved ? parseInt(saved) : 0;
  });
  
  const [gameState, setGameState] = useState<GameState>({
    status: 'idle',
    score: 0,
    bugsKilled: 0,
    snailPosition: [0, 0],
    snailRotation: 0,
    bugs: [],
    bullets: [],
    health: 100
  });

  const startGame = useCallback(() => {
    setGameState({
      status: 'playing',
      score: 0,
      bugsKilled: 0,
      snailPosition: [0, 0],
      snailRotation: 0,
      bugs: [],
      bullets: [],
      health: 100
    });
  }, []);

  return (
    <section className="py-8 sm:py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-display text-3xl sm:text-4xl text-center text-primary mb-2">
          Snail Shooter! 🐌💥
        </h2>
        <p className="font-body text-base sm:text-lg text-center text-muted-foreground mb-4">
          Hold SPACE to unleash machine gun fire! WASD to move, A/D to rotate!
        </p>


        {/* Game area */}
        <div 
          className="relative w-full rounded-2xl retro-border overflow-hidden"
          style={{ height: 400 }}
        >
          <Canvas>
            <GameScene 
              gameState={gameState} 
              setGameState={setGameState} 
              difficulty={difficulty}
              highScore={highScore}
              setHighScore={setHighScore}
            />
          </Canvas>

          {/* In-game HUD overlay */}
          {gameState.status === 'playing' && (
            <div className="absolute top-0 left-0 right-0 p-3 pointer-events-none">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  {/* Health bar */}
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
                </div>
                
                <div className="flex items-center gap-4 font-display text-white drop-shadow-lg">
                  <span className="bg-black/40 px-3 py-1 rounded-lg">
                    Score: <span className="text-yellow-400">{Math.floor(gameState.score)}</span>
                  </span>
                  <span className="bg-black/40 px-3 py-1 rounded-lg">
                    💀 <span className="text-red-400">{gameState.bugsKilled}</span>
                  </span>
                  <span className="bg-black/40 px-3 py-1 rounded-lg text-sm">
                    Best: {highScore}
                  </span>
                </div>
              </div>
            </div>
          )}
          {/* Overlays */}
          {gameState.status === 'idle' && (
            <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center p-4">
              <div className="text-6xl mb-4">🐌🔫</div>
              <p className="font-display text-2xl sm:text-3xl text-primary mb-2">Snail Shooter!</p>
              <p className="font-body text-sm sm:text-base text-foreground text-center mb-4">
                WASD or Arrows to move & rotate<br/>
                Hold SPACE for machine gun fire!
              </p>
              <Button variant="game" size="lg" onClick={startGame}>
                Start Game
              </Button>
            </div>
          )}

          {gameState.status === 'gameover' && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
              <p className="font-display text-3xl sm:text-4xl text-destructive mb-2">Game Over!</p>
              <p className="font-display text-xl text-foreground mb-1">Score: {Math.floor(gameState.score)}</p>
              <p className="font-body text-lg text-muted-foreground mb-3">Bugs blasted: {gameState.bugsKilled} 💥</p>
              {Math.floor(gameState.score) >= highScore && gameState.score > 0 && (
                <p className="font-body text-lg text-accent mb-3">🎉 New High Score! 🎉</p>
              )}
              <Button variant="game" size="lg" onClick={startGame}>
                Play Again
              </Button>
            </div>
          )}
        </div>

        {/* Difficulty toggle */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="font-body text-sm text-muted-foreground">Difficulty:</span>
          <div className="flex gap-1">
            {(['slow', 'medium', 'hard'] as Difficulty[]).map((level) => (
              <Button
                key={level}
                variant={difficulty === level ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDifficulty(level)}
                className="font-display capitalize"
              >
                {level === 'slow' && '🐢'} 
                {level === 'medium' && '🐇'} 
                {level === 'hard' && '🚀'} 
                {level}
              </Button>
            ))}
          </div>
        </div>

        <p className="text-center text-muted-foreground font-body text-sm mt-3">
          Pro tip: Keep moving and shooting to survive the bug swarm!
        </p>
      </div>
    </section>
  );
};
