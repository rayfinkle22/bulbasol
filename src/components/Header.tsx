import { Button } from "@/components/ui/button";
import snailImage from "@/assets/snail.png";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <img src={snailImage} alt="Snail" className="w-10 h-10 object-contain" />
          <span className="font-display text-2xl font-bold text-primary">$SNAIL</span>
        </div>
        
        {/* Social Links */}
        <div className="flex gap-2 sm:gap-3">
          <Button
            variant="social"
            size="sm"
            asChild
          >
            <a 
              href="https://dexscreener.com" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <span className="font-mono text-xs">[DEX]</span>
              <span className="hidden sm:inline">Dexscreener</span>
            </a>
          </Button>
          
          <Button
            variant="social"
            size="sm"
            asChild
          >
            <a 
              href="https://x.com" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <span className="font-mono text-xs">[X]</span>
              <span className="hidden sm:inline">Community</span>
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
};
