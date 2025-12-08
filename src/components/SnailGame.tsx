import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import snailImage from "@/assets/snail.png";

interface Obstacle {
  id: number;
  x: number;
  y: number;
  speed: number;
  type: 'stick' | 'tumbleweed';
}

interface Collectible {
  id: number;
  x: number;
  y: number;
  speed: number;
  type: 'beetle' | 'fly' | 'caterpillar';
}

const OBSTACLE_ICONS = {
  stick: '🪵',
  tumbleweed: '🌿',
};

const COLLECTIBLE_ICONS = {
  beetle: '🪲',
  fly: '🪰',
  caterpillar: '🐛',
};

export const SnailGame = () => {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [bugsEaten, setBugsEaten] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snail-highscore');
    return saved ? parseInt(saved) : 0;
  });
  const [snailY, setSnailY] = useState(50);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const spawnRef = useRef<number | null>(null);
  const snailYRef = useRef(50);
  const scoreRef = useRef(0);

  const SNAIL_X = 15; // percentage from left
  const COLLISION_DISTANCE = 8; // percentage

  // Keep refs in sync
  useEffect(() => {
    snailYRef.current = snailY;
  }, [snailY]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  // Keep ref in sync
  useEffect(() => {
    snailYRef.current = snailY;
  }, [snailY]);

  const moveSnail = useCallback((direction: 'up' | 'down') => {
    setSnailY(prev => {
      const newY = direction === 'up' 
        ? Math.max(15, prev - 12) 
        : Math.min(85, prev + 12);
      return newY;
    });
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameState !== 'playing') return;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      moveSnail('up');
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      e.preventDefault();
      moveSnail('down');
    }
  }, [gameState, moveSnail]);

  // Touch/mouse controls for mobile
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (gameState !== 'playing' || !gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const pointerY = e.clientY - rect.top;
    const percentY = (pointerY / rect.height) * 100;
    setSnailY(Math.max(15, Math.min(85, percentY)));
  }, [gameState]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const spawnItems = useCallback(() => {
    const currentScore = scoreRef.current;
    
    // Spawn obstacle (stick or tumbleweed)
    if (Math.random() < 0.6) {
      const obstacleTypes: Obstacle['type'][] = ['stick', 'tumbleweed'];
      const newObstacle: Obstacle = {
        id: Date.now() + Math.random(),
        x: 105,
        y: Math.random() * 60 + 20,
        speed: 1.5 + Math.random() * 1.5 + (currentScore / 50),
        type: obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)],
      };
      setObstacles(prev => [...prev, newObstacle]);
    }

    // Spawn collectible (bug to eat)
    if (Math.random() < 0.4) {
      const collectibleTypes: Collectible['type'][] = ['beetle', 'fly', 'caterpillar'];
      const newCollectible: Collectible = {
        id: Date.now() + Math.random() + 1,
        x: 105,
        y: Math.random() * 60 + 20,
        speed: 1 + Math.random() * 1 + (currentScore / 80),
        type: collectibleTypes[Math.floor(Math.random() * collectibleTypes.length)],
      };
      setCollectibles(prev => [...prev, newCollectible]);
    }
  }, []);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setBugsEaten(0);
    setSnailY(50);
    setObstacles([]);
    setCollectibles([]);
  };

  useEffect(() => {
    if (gameState !== 'playing') return;

    let lastTime = performance.now();
    
    const gameLoop = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 16.67; // normalize to ~60fps
      lastTime = currentTime;

      // Update obstacles
      setObstacles(prev => {
        const updated = prev
          .map(obs => ({ ...obs, x: obs.x - obs.speed * deltaTime }))
          .filter(obs => obs.x > -10);

        // Check collision with obstacles
        for (const obs of updated) {
          const dx = Math.abs(SNAIL_X - obs.x);
          const dy = Math.abs(snailYRef.current - obs.y);
          if (dx < COLLISION_DISTANCE && dy < COLLISION_DISTANCE) {
            setGameState('gameover');
            setScore(s => {
              if (s > highScore) {
                setHighScore(s);
                localStorage.setItem('snail-highscore', s.toString());
              }
              return s;
            });
            return [];
          }
        }

        return updated;
      });

      // Update collectibles
      setCollectibles(prev => {
        const updated: Collectible[] = [];
        
        for (const col of prev) {
          const newX = col.x - col.speed * deltaTime;
          if (newX <= -10) continue;

          const dx = Math.abs(SNAIL_X - newX);
          const dy = Math.abs(snailYRef.current - col.y);
          
          if (dx < COLLISION_DISTANCE && dy < COLLISION_DISTANCE) {
            // Collected!
            setScore(s => s + 10);
            setBugsEaten(b => b + 1);
          } else {
            updated.push({ ...col, x: newX });
          }
        }

        return updated;
      });

      // Increment score over time
      setScore(s => s + 0.1);

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    // Spawn items periodically
    spawnRef.current = window.setInterval(() => {
      spawnItems();
    }, 800);

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      if (spawnRef.current) clearInterval(spawnRef.current);
    };
  }, [gameState, spawnItems, highScore]);

  return (
    <section className="py-8 sm:py-12 px-4">
      <div className="max-w-lg mx-auto">
        <h2 className="font-display text-3xl sm:text-4xl text-center text-primary mb-2">
          Snail's Adventure!
        </h2>
        <p className="font-body text-base sm:text-lg text-center text-muted-foreground mb-4">
          Dodge sticks & tumbleweeds 🪵 — Eat bugs for points! 🪲
        </p>
        <p className="font-body text-sm text-center text-muted-foreground mb-4">
          Use ↑↓ keys or drag/touch to move
        </p>

        {/* Score display */}
        <div className="flex justify-between items-center mb-3 font-display text-lg">
          <span className="text-foreground">Score: <span className="text-accent">{Math.floor(score)}</span></span>
          <span className="text-foreground">🪲 <span className="text-primary">{bugsEaten}</span></span>
          <span className="text-muted-foreground">Best: <span className="text-primary">{highScore}</span></span>
        </div>

        {/* Game area */}
        <div 
          ref={gameAreaRef}
          className="relative w-full rounded-2xl retro-border overflow-hidden cursor-pointer touch-none select-none"
          style={{ 
            height: 280,
            background: 'linear-gradient(180deg, hsl(195 70% 75%) 0%, hsl(195 60% 85%) 30%, hsl(90 55% 70%) 50%, hsl(95 50% 55%) 70%, hsl(35 40% 50%) 100%)'
          }}
          onClick={() => gameState !== 'playing' ? startGame() : null}
          onPointerMove={handlePointerMove}
        >
          {/* Clouds */}
          <div className="absolute top-4 left-8 text-3xl opacity-60">☁️</div>
          <div className="absolute top-8 right-12 text-2xl opacity-50">☁️</div>
          
          {/* Ground decorations */}
          <div className="absolute bottom-6 left-8 text-xl">🌱</div>
          <div className="absolute bottom-8 right-16 text-lg">🌿</div>
          <div className="absolute bottom-4 left-1/2 text-sm">🍃</div>

          {/* Snail */}
          <div 
            className={`absolute transition-all duration-75 ${gameState === 'playing' ? '' : ''}`}
            style={{ 
              left: `${SNAIL_X}%`,
              top: `${snailY}%`,
              transform: 'translate(-50%, -50%)',
              width: 50,
              height: 50,
            }}
          >
            <img 
              src={snailImage} 
              alt="Snail" 
              className={`w-full h-full object-contain ${gameState === 'playing' ? 'animate-bounce-snail' : 'animate-wiggle'}`}
              style={{ filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.3))' }}
            />
          </div>

          {/* Obstacles (things to dodge) */}
          {obstacles.map(obs => (
            <div
              key={obs.id}
              className={`absolute text-3xl ${obs.type === 'tumbleweed' ? 'animate-tumble' : ''}`}
              style={{
                left: `${obs.x}%`,
                top: `${obs.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {OBSTACLE_ICONS[obs.type]}
            </div>
          ))}

          {/* Collectibles (bugs to eat) */}
          {collectibles.map(col => (
            <div
              key={col.id}
              className="absolute text-2xl animate-pulse-glow"
              style={{
                left: `${col.x}%`,
                top: `${col.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {COLLECTIBLE_ICONS[col.type]}
            </div>
          ))}

          {/* Game states overlay */}
          {gameState === 'idle' && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center p-4">
              <img src={snailImage} alt="Snail" className="w-20 h-20 object-contain mb-4 animate-wiggle" />
              <p className="font-display text-2xl sm:text-3xl text-primary mb-2">Tap to Start!</p>
              <p className="font-body text-sm sm:text-base text-foreground text-center">
                Dodge 🪵 sticks & 🌿 tumbleweeds<br/>
                Eat 🪲 bugs for bonus points!
              </p>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center p-4">
              <p className="font-display text-3xl sm:text-4xl text-destructive mb-2">Game Over!</p>
              <p className="font-display text-xl text-foreground mb-1">Score: {Math.floor(score)}</p>
              <p className="font-body text-lg text-muted-foreground mb-3">Bugs eaten: {bugsEaten} 🪲</p>
              {Math.floor(score) >= highScore && score > 0 && (
                <p className="font-body text-lg text-accent mb-3">🎉 New High Score! 🎉</p>
              )}
              <Button variant="game" size="lg" onClick={startGame}>
                Play Again
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-muted-foreground font-body text-sm mt-3">
          Pro tip: The game speeds up as you survive longer!
        </p>
      </div>
    </section>
  );
};
