import { useState, useEffect, useCallback, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text, OrthographicCamera } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import * as THREE from "three";

interface Bug {
  id: number;
  position: [number, number, number];
  velocity: [number, number];
  type: 'beetle' | 'fly' | 'spider';
  health: number;
}

interface Rocket {
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
  rockets: Rocket[];
  health: number;
}

type Difficulty = 'slow' | 'medium' | 'hard';

const SPEED_MULTIPLIERS: Record<Difficulty, number> = {
  slow: 0.3,
  medium: 0.6,
  hard: 1.0,
};

const BUG_COLORS = {
  beetle: '#2d5a27',
  fly: '#1a1a2e',
  spider: '#4a1f1f',
};

// 3D Snail component
function Snail({ position, rotation }: { position: [number, number]; rotation: number }) {
  return (
    <group position={[position[0], 0.3, position[1]]} rotation={[0, rotation, 0]}>
      {/* Shell */}
      <mesh position={[-0.15, 0.25, 0]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      {/* Shell spiral */}
      <mesh position={[-0.15, 0.25, 0.15]}>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshStandardMaterial color="#654321" />
      </mesh>
      {/* Body */}
      <mesh position={[0.1, 0, 0]}>
        <capsuleGeometry args={[0.15, 0.4, 8, 16]} />
        <meshStandardMaterial color="#90EE90" />
      </mesh>
      {/* Eyes */}
      <mesh position={[0.35, 0.3, 0.1]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#fff" />
      </mesh>
      <mesh position={[0.35, 0.3, -0.1]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#fff" />
      </mesh>
      {/* Eye stalks */}
      <mesh position={[0.3, 0.2, 0.1]} rotation={[0, 0, 0.5]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
        <meshStandardMaterial color="#90EE90" />
      </mesh>
      <mesh position={[0.3, 0.2, -0.1]} rotation={[0, 0, 0.5]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
        <meshStandardMaterial color="#90EE90" />
      </mesh>
      {/* Bazooka */}
      <group position={[0.2, 0.1, 0.25]} rotation={[0, 0, 0.2]}>
        <mesh>
          <cylinderGeometry args={[0.08, 0.1, 0.6, 12]} />
          <meshStandardMaterial color="#2F4F4F" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.12, 0.08, 0.15, 12]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

// Bug component
function Bug({ bug }: { bug: Bug }) {
  const color = BUG_COLORS[bug.type];
  
  return (
    <group position={bug.position}>
      {/* Body */}
      <mesh>
        <sphereGeometry args={[0.25, 12, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Head */}
      <mesh position={[0.2, 0, 0]}>
        <sphereGeometry args={[0.15, 10, 10]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Legs */}
      {[-0.12, 0, 0.12].map((z, i) => (
        <group key={i}>
          <mesh position={[0, -0.1, z + 0.2]} rotation={[0.5, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.15, 6]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          <mesh position={[0, -0.1, z - 0.2]} rotation={[-0.5, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.15, 6]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        </group>
      ))}
      {/* Eyes */}
      <mesh position={[0.3, 0.08, 0.08]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.3, 0.08, -0.08]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

// Rocket component
function Rocket({ rocket }: { rocket: Rocket }) {
  return (
    <group position={rocket.position}>
      {/* Rocket body */}
      <mesh rotation={[Math.PI / 2, 0, Math.atan2(rocket.velocity[1], rocket.velocity[0])]}>
        <capsuleGeometry args={[0.08, 0.3, 6, 12]} />
        <meshStandardMaterial color="#ff6b35" emissive="#ff4500" emissiveIntensity={0.5} />
      </mesh>
      {/* Flame trail */}
      <mesh position={[-rocket.velocity[0] * 0.2, 0.1, -rocket.velocity[1] * 0.2]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#ffff00" emissive="#ff8c00" emissiveIntensity={1} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

// Ground plane
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#4a7c3f" />
    </mesh>
  );
}

// Grass patches
function GrassPatches() {
  const patches = useRef<[number, number, number][]>([]);
  
  if (patches.current.length === 0) {
    for (let i = 0; i < 50; i++) {
      patches.current.push([
        (Math.random() - 0.5) * 20,
        0.02,
        (Math.random() - 0.5) * 20
      ]);
    }
  }
  
  return (
    <>
      {patches.current.map((pos, i) => (
        <mesh key={i} position={pos} rotation={[-Math.PI / 2, 0, Math.random() * Math.PI]}>
          <circleGeometry args={[0.15 + Math.random() * 0.1, 6]} />
          <meshStandardMaterial color="#3d6b35" />
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
  const { camera } = useThree();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase());
      if (e.key === ' ' && gameState.status === 'playing') {
        e.preventDefault();
        // Fire rocket
        const angle = gameState.snailRotation;
        const velocity: [number, number] = [
          Math.sin(angle) * 0.4,
          Math.cos(angle) * 0.4
        ];
        const newRocket: Rocket = {
          id: Date.now() + Math.random(),
          position: [
            gameState.snailPosition[0] + Math.sin(angle) * 0.5,
            0.4,
            gameState.snailPosition[1] + Math.cos(angle) * 0.5
          ],
          velocity
        };
        setGameState(prev => ({
          ...prev,
          rockets: [...prev.rockets, newRocket]
        }));
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.status, gameState.snailRotation, gameState.snailPosition, setGameState]);

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

    // Spawn bugs
    const now = performance.now();
    if (now - lastSpawn.current > 2000 / speedMult) {
      lastSpawn.current = now;
      const angle = Math.random() * Math.PI * 2;
      const distance = 8 + Math.random() * 2;
      const bugTypes: Bug['type'][] = ['beetle', 'fly', 'spider'];
      const newBug: Bug = {
        id: Date.now() + Math.random(),
        position: [
          Math.sin(angle) * distance,
          0.25,
          Math.cos(angle) * distance
        ],
        velocity: [0, 0],
        type: bugTypes[Math.floor(Math.random() * bugTypes.length)],
        health: 1
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

      // Update rockets
      let updatedRockets = prev.rockets
        .map(r => ({
          ...r,
          position: [
            r.position[0] + r.velocity[0],
            r.position[1],
            r.position[2] + r.velocity[1]
          ] as [number, number, number]
        }))
        .filter(r => 
          Math.abs(r.position[0]) < 12 && 
          Math.abs(r.position[2]) < 12
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

      // Check rocket-bug collisions
      let newScore = prev.score;
      let newBugsKilled = prev.bugsKilled;
      
      updatedBugs = updatedBugs.filter(bug => {
        for (let i = updatedRockets.length - 1; i >= 0; i--) {
          const r = updatedRockets[i];
          const dx = bug.position[0] - r.position[0];
          const dz = bug.position[2] - r.position[2];
          const dist = Math.sqrt(dx * dx + dz * dz);
          
          if (dist < 0.5) {
            updatedRockets.splice(i, 1);
            newScore += 25;
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
        rockets: updatedRockets,
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
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 8, -5]} intensity={0.4} />
      
      <Ground />
      <GrassPatches />
      
      <Snail position={gameState.snailPosition} rotation={gameState.snailRotation} />
      
      {gameState.bugs.map(bug => (
        <Bug key={bug.id} bug={bug} />
      ))}
      
      {gameState.rockets.map(rocket => (
        <Rocket key={rocket.id} rocket={rocket} />
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
    rockets: [],
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
      rockets: [],
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
          Blast those bugs with your bazooka! WASD to move, A/D to rotate, SPACE to fire!
        </p>

        {/* Score & Health display */}
        <div className="flex justify-between items-center mb-3 font-display text-lg">
          <span className="text-foreground">Score: <span className="text-accent">{Math.floor(gameState.score)}</span></span>
          <span className="text-foreground">❤️ <span className={gameState.health <= 30 ? 'text-destructive' : 'text-primary'}>{gameState.health}</span></span>
          <span className="text-foreground">💀 <span className="text-primary">{gameState.bugsKilled}</span></span>
          <span className="text-muted-foreground">Best: <span className="text-primary">{highScore}</span></span>
        </div>

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

          {/* Overlays */}
          {gameState.status === 'idle' && (
            <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center p-4">
              <div className="text-6xl mb-4">🐌🚀</div>
              <p className="font-display text-2xl sm:text-3xl text-primary mb-2">Snail Shooter!</p>
              <p className="font-body text-sm sm:text-base text-foreground text-center mb-4">
                WASD or Arrows to move & rotate<br/>
                SPACE to fire rockets at bugs!
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
