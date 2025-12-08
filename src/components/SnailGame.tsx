import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";

interface Bug {
  id: number;
  x: number;
  y: number;
  speed: number;
  type: 'beetle' | 'spider' | 'fly';
}

interface Snail {
  y: number;
}

const BUG_EMOJIS = {
  beetle: '🪲',
  spider: '🕷️',
  fly: '🪰',
};

export const SnailGame = () => {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snail-highscore');
    return saved ? parseInt(saved) : 0;
  });
  const [snail, setSnail] = useState<Snail>({ y: 50 });
  const [bugs, setBugs] = useState<Bug[]>([]);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<number>();
  const bugSpawnRef = useRef<number>();

  const GAME_WIDTH = 400;
  const GAME_HEIGHT = 300;
  const SNAIL_SIZE = 40;
  const BUG_SIZE = 30;
  const SNAIL_X = 50;

  const moveSnail = useCallback((direction: 'up' | 'down') => {
    setSnail(prev => {
      const newY = direction === 'up' 
        ? Math.max(10, prev.y - 15) 
        : Math.min(90, prev.y + 15);
      return { y: newY };
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

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (gameState !== 'playing' || !gameAreaRef.current) return;
    e.preventDefault();
    const rect = gameAreaRef.current.getBoundingClientRect();
    const touchY = e.touches[0].clientY - rect.top;
    const percentY = (touchY / rect.height) * 100;
    setSnail({ y: Math.max(10, Math.min(90, percentY)) });
  }, [gameState]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    const gameArea = gameAreaRef.current;
    if (gameArea) {
      gameArea.addEventListener('touchmove', handleTouchMove, { passive: false });
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (gameArea) {
        gameArea.removeEventListener('touchmove', handleTouchMove);
      }
    };
  }, [handleKeyDown, handleTouchMove]);

  const spawnBug = useCallback(() => {
    const types: Bug['type'][] = ['beetle', 'spider', 'fly'];
    const newBug: Bug = {
      id: Date.now() + Math.random(),
      x: 100,
      y: Math.random() * 80 + 10,
      speed: 1 + Math.random() * 2 + (score / 20),
      type: types[Math.floor(Math.random() * types.length)],
    };
    setBugs(prev => [...prev, newBug]);
  }, [score]);

  const checkCollision = useCallback((bugX: number, bugY: number) => {
    const snailPixelY = (snail.y / 100) * GAME_HEIGHT;
    const bugPixelX = (bugX / 100) * GAME_WIDTH;
    const bugPixelY = (bugY / 100) * GAME_HEIGHT;

    const dx = SNAIL_X - bugPixelX;
    const dy = snailPixelY - bugPixelY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < (SNAIL_SIZE + BUG_SIZE) / 2;
  }, [snail.y]);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setSnail({ y: 50 });
    setBugs([]);
  };

  useEffect(() => {
    if (gameState !== 'playing') return;

    gameLoopRef.current = window.setInterval(() => {
      setBugs(prev => {
        const updated = prev
          .map(bug => ({ ...bug, x: bug.x - bug.speed }))
          .filter(bug => bug.x > -10);

        // Check collisions
        for (const bug of updated) {
          if (checkCollision(bug.x, bug.y)) {
            setGameState('gameover');
            if (score > highScore) {
              setHighScore(score);
              localStorage.setItem('snail-highscore', score.toString());
            }
            return [];
          }
        }

        return updated;
      });

      setScore(prev => prev + 1);
    }, 50);

    bugSpawnRef.current = window.setInterval(() => {
      spawnBug();
    }, Math.max(500, 1500 - score * 10));

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      if (bugSpawnRef.current) clearInterval(bugSpawnRef.current);
    };
  }, [gameState, spawnBug, checkCollision, score, highScore]);

  return (
    <section className="py-16 px-4">
      <div className="max-w-xl mx-auto">
        <h2 className="font-display text-4xl md:text-5xl text-center text-accent mb-4">
          Snail Dodge!
        </h2>
        <p className="font-body text-xl text-center text-muted-foreground mb-8">
          Help Snail dodge the bugs! Use ↑↓ keys or touch to move.
        </p>

        {/* Score display */}
        <div className="flex justify-between items-center mb-4 font-display text-xl">
          <span className="text-foreground">Score: <span className="text-accent">{score}</span></span>
          <span className="text-muted-foreground">Best: <span className="text-primary">{highScore}</span></span>
        </div>

        {/* Game area */}
        <div 
          ref={gameAreaRef}
          className="relative w-full rounded-2xl retro-border overflow-hidden cursor-pointer"
          style={{ 
            height: GAME_HEIGHT,
            background: 'linear-gradient(180deg, hsl(200 60% 70%) 0%, hsl(120 40% 50%) 70%, hsl(30 40% 30%) 100%)'
          }}
          onClick={() => gameState === 'idle' || gameState === 'gameover' ? startGame() : null}
        >
          {/* Ground */}
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-secondary to-transparent" />
          
          {/* Grass decorations */}
          <div className="absolute bottom-8 left-4 text-2xl">🌿</div>
          <div className="absolute bottom-8 right-8 text-2xl">🌱</div>
          <div className="absolute bottom-8 left-1/3 text-xl">🌿</div>

          {/* Snail */}
          <div 
            className={`absolute transition-all duration-100 text-4xl ${gameState === 'playing' ? 'animate-bounce-snail' : ''}`}
            style={{ 
              left: SNAIL_X,
              top: `${snail.y}%`,
              transform: 'translateY(-50%)',
            }}
          >
            🐌
          </div>

          {/* Bugs */}
          {bugs.map(bug => (
            <div
              key={bug.id}
              className="absolute text-3xl animate-bug-fly"
              style={{
                left: `${bug.x}%`,
                top: `${bug.y}%`,
                transform: 'translateY(-50%) scaleX(-1)',
              }}
            >
              {BUG_EMOJIS[bug.type]}
            </div>
          ))}

          {/* Game states overlay */}
          {gameState === 'idle' && (
            <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center">
              <p className="font-display text-3xl text-accent mb-4">Click to Start!</p>
              <p className="font-body text-lg text-foreground">Dodge the bugs 🪲</p>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
              <p className="font-display text-4xl text-game-bug mb-2">Game Over!</p>
              <p className="font-display text-2xl text-foreground mb-4">Score: {score}</p>
              {score >= highScore && score > 0 && (
                <p className="font-body text-xl text-accent mb-4">🎉 New High Score! 🎉</p>
              )}
              <Button variant="game" size="lg" onClick={startGame}>
                Play Again
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-muted-foreground font-body mt-4">
          Pro tip: The bugs get faster as you survive longer!
        </p>
      </div>
    </section>
  );
};
