import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import snailImage from "@/assets/snail-game.png";
import heroBanner from "@/assets/hero-banner.png";
const CONTRACT_ADDRESS = "5t4VZ55DuoEKsChjNgFTb6Rampsk3tLuVus2RVHmpump";

export const HeroSection = () => {
  const [copied, setCopied] = useState(false);

  const copyCA = async () => {
    try {
      await navigator.clipboard.writeText(CONTRACT_ADDRESS);
      setCopied(true);
      toast.success("Contract address copied! 🐌");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <section className="relative flex flex-col items-center justify-center px-3 sm:px-4 py-4 sm:py-12 overflow-hidden">
      {/* Main content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto w-full">
        {/* Hero banner - matching game width */}
        <div className="mb-3 sm:mb-6 relative">
          <div className="w-full rounded-xl sm:rounded-2xl retro-border overflow-hidden">
            <img 
              src={heroBanner} 
              alt="Franklin and Snail" 
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
        
        {/* Title with Franklin-style outline */}
        <h1 className="font-display text-3xl sm:text-7xl md:text-8xl font-bold text-accent text-outline mb-1 sm:mb-3">
          $SNAIL
        </h1>
        
        {/* Tagline */}
        <p className="font-body text-sm sm:text-2xl md:text-3xl text-foreground mb-2 sm:mb-4">
          Franklin&apos;s ride or die homie. The only one that rides his shell 🐢
        </p>
        
        {/* Catchphrase */}
        <p className="font-body text-xs sm:text-lg text-muted-foreground italic mb-3 sm:mb-6">
          &quot;Slow and steady wins the race... to the moon!&quot; 🌙
        </p>

        {/* Buttons Section */}
        <div className="flex flex-col items-center gap-2 sm:gap-4">
          {/* DEX and Community buttons */}
          <div className="flex gap-2 sm:gap-3 flex-wrap justify-center">
            <Button
              variant="fun"
              size="default"
              asChild
              className="group h-8 sm:h-11 px-3 sm:px-4"
            >
              <a 
                href="https://dexscreener.com/solana/5t4VZ55DuoEKsChjNgFTb6Rampsk3tLuVus2RVHmpump" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <span className="text-base sm:text-xl group-hover:animate-bounce">📊</span>
                <span className="font-display text-xs sm:text-base">DEX</span>
                <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 opacity-60" />
              </a>
            </Button>
            
            <Button
              variant="fun"
              size="default"
              asChild
              className="group h-8 sm:h-11 px-3 sm:px-4"
            >
              <a 
                href="https://x.com" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <span className="text-base sm:text-xl group-hover:animate-bounce">🐦</span>
                <span className="font-display text-xs sm:text-base">Community</span>
                <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 opacity-60" />
              </a>
            </Button>
          </div>

          {/* Contract Address button */}
          <button
            onClick={copyCA}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-card hover:bg-secondary/50 rounded-full border-2 border-dashed border-primary/40 hover:border-accent transition-all group"
          >
            <span className="text-[10px] sm:text-xs text-muted-foreground font-body">CA:</span>
            <code className="text-[10px] sm:text-sm font-mono text-foreground/80 truncate max-w-[150px] sm:max-w-none">
              {CONTRACT_ADDRESS}
            </code>
            {copied ? (
              <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
            ) : (
              <Copy className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground group-hover:text-accent flex-shrink-0 transition-colors" />
            )}
            <img src={snailImage} alt="Snail" className="w-4 h-4 sm:w-6 sm:h-6 object-contain" />
          </button>
        </div>
      </div>
    </section>
  );
};
