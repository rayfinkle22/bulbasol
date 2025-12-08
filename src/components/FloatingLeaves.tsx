import { useEffect, useState } from "react";

interface Leaf {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  emoji: string;
  opacity: number;
}

const LEAF_EMOJIS = ['🍂', '🍃', '🌿', '🍁', '🍂', '🍃', '🍁'];

export const FloatingLeaves = () => {
  const [leaves, setLeaves] = useState<Leaf[]>([]);

  useEffect(() => {
    const generateLeaves = () => {
      const newLeaves: Leaf[] = [];
      for (let i = 0; i < 60; i++) {
        newLeaves.push({
          id: i,
          x: Math.random() * 100,
          delay: Math.random() * 15,
          duration: 6 + Math.random() * 12,
          size: 14 + Math.random() * 24,
          emoji: LEAF_EMOJIS[Math.floor(Math.random() * LEAF_EMOJIS.length)],
          opacity: 0.4 + Math.random() * 0.5,
        });
      }
      setLeaves(newLeaves);
    };

    generateLeaves();
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {leaves.map((leaf) => (
        <div
          key={leaf.id}
          className="absolute animate-leaf-fall"
          style={{
            left: `${leaf.x}%`,
            top: '-5%',
            fontSize: `${leaf.size}px`,
            animationDelay: `${leaf.delay}s`,
            animationDuration: `${leaf.duration}s`,
            opacity: leaf.opacity,
          }}
        >
          {leaf.emoji}
        </div>
      ))}
    </div>
  );
};
