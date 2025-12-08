import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
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
    <section className="relative flex flex-col items-center justify-center px-4 py-8 sm:py-12 overflow-hidden">
      {/* Main content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto w-full">
        {/* Hero banner */}
        <div className="mb-6 relative">
          <div className="w-full max-w-3xl mx-auto rounded-2xl retro-border overflow-hidden">
            <img 
              src={heroBanner} 
              alt="Franklin and Snail - $SNAIL Token" 
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
        
        {/* Title with Franklin-style outline */}
        <h1 className="font-display text-5xl sm:text-7xl md:text-8xl font-bold text-accent text-outline mb-3">
          $SNAIL
        </h1>
        
        {/* Tagline */}
        <p className="font-body text-xl sm:text-2xl md:text-3xl text-foreground mb-4">
          Franklin&apos;s Best Friend on the Blockchain 🐢
        </p>
        
        {/* Catchphrase */}
        <p className="font-body text-lg text-muted-foreground italic mb-6">
          &quot;Slow and steady wins the race... to the moon!&quot; 🌙
        </p>

        {/* Buttons Section */}
        <div className="flex flex-col items-center gap-4">
          {/* DEX and Community buttons */}
          <div className="flex gap-3 flex-wrap justify-center">
            <Button
              variant="fun"
              size="lg"
              asChild
              className="group"
            >
              <a 
                href="https://dexscreener.com/solana/5t4VZ55DuoEKsChjNgFTb6Rampsk3tLuVus2RVHmpump" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <span className="text-xl group-hover:animate-bounce">📊</span>
                <span className="font-display">DEX</span>
                <ExternalLink className="w-4 h-4 opacity-60" />
              </a>
            </Button>
            
            <Button
              variant="fun"
              size="lg"
              asChild
              className="group"
            >
              <a 
                href="https://x.com" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <span className="text-xl group-hover:animate-bounce">🐦</span>
                <span className="font-display">Community</span>
                <ExternalLink className="w-4 h-4 opacity-60" />
              </a>
            </Button>
          </div>

          {/* Contract Address button */}
          <button
            onClick={copyCA}
            className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-secondary/50 rounded-full border-2 border-dashed border-primary/40 hover:border-accent transition-all group"
          >
            <span className="text-xs text-muted-foreground font-body">CA:</span>
            <code className="text-xs sm:text-sm font-mono text-foreground/80 truncate max-w-[200px] sm:max-w-none">
              {CONTRACT_ADDRESS}
            </code>
            {copied ? (
              <Check className="w-4 h-4 text-primary flex-shrink-0" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground group-hover:text-accent flex-shrink-0 transition-colors" />
            )}
            <span className="text-sm">🐌</span>
          </button>
        </div>
      </div>
    </section>
  );
};
