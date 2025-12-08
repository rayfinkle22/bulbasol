import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink } from "lucide-react";
import snailImage from "@/assets/snail.png";
import { toast } from "sonner";

const CONTRACT_ADDRESS = "5t4VZ55DuoEKsChjNgFTb6Rampsk3tLuVus2RVHmpump";

export const Header = () => {
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
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur border-b-4 border-primary/30">
      <div className="max-w-6xl mx-auto px-3 py-2 sm:py-3">
        {/* Top row - Logo and social links */}
        <div className="flex items-center justify-between gap-2 mb-2">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src={snailImage} alt="Snail" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
            <span className="font-display text-xl sm:text-2xl font-bold text-primary">$SNAIL</span>
          </div>
          
          {/* Social Links - Fun buttons */}
          <div className="flex gap-2">
            <Button
              variant="fun"
              size="sm"
              asChild
              className="group"
            >
              <a 
                href="https://dexscreener.com/solana/5t4VZ55DuoEKsChjNgFTb6Rampsk3tLuVus2RVHmpump" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <span className="text-lg group-hover:animate-bounce">📊</span>
                <span className="hidden sm:inline font-display">DEX</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            </Button>
            
            <Button
              variant="fun"
              size="sm"
              asChild
              className="group"
            >
              <a 
                href="https://x.com" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <span className="text-lg group-hover:animate-bounce">🐦</span>
                <span className="hidden sm:inline font-display">Community</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            </Button>
          </div>
        </div>

        {/* Contract Address Row */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground font-body hidden sm:inline">CA:</span>
          <button
            onClick={copyCA}
            className="flex items-center gap-2 px-3 py-1.5 bg-card hover:bg-secondary/50 rounded-full border-2 border-dashed border-primary/40 hover:border-accent transition-all group"
          >
            <code className="text-xs sm:text-sm font-mono text-foreground/80 truncate max-w-[200px] sm:max-w-none">
              {CONTRACT_ADDRESS}
            </code>
            {copied ? (
              <Check className="w-4 h-4 text-primary flex-shrink-0" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground group-hover:text-accent flex-shrink-0 transition-colors" />
            )}
          </button>
          <span className="text-sm">🐌</span>
        </div>
      </div>
    </header>
  );
};
