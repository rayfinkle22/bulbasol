import { Button } from "@/components/ui/button";

export const SocialLinks = () => {
  return (
    <div className="flex flex-wrap gap-4 justify-center">
      <Button
        variant="social"
        size="lg"
        asChild
      >
        <a 
          href="https://dexscreener.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="gap-2"
        >
          <span className="font-mono">[DEX]</span> Dexscreener
        </a>
      </Button>
      
      <Button
        variant="social"
        size="lg"
        asChild
      >
        <a 
          href="https://x.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="gap-2"
        >
          <span className="font-mono">[X]</span> Community
        </a>
      </Button>
    </div>
  );
};
