import snailImage from "@/assets/snail.png";

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="py-6 px-4 border-t border-border bg-card/50">
      <div className="max-w-4xl mx-auto text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <img src={snailImage} alt="Snail" className="w-10 h-10 object-contain" />
          <span className="font-display text-xl text-primary font-bold">$SNAIL</span>
        </div>
        
        <p className="font-body text-muted-foreground mb-3 text-sm">
          Slow and steady. Just like Franklin's best friend. 🐢
        </p>
        
        <div className="flex flex-wrap justify-center gap-3 mb-4 text-sm font-body">
          <a 
            href="https://dexscreener.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-accent transition-colors"
          >
            Dexscreener
          </a>
          <span className="text-border">•</span>
          <a 
            href="https://x.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-accent transition-colors"
          >
            X Community
          </a>
        </div>
        
        <p className="font-body text-xs text-muted-foreground/60">
          © {currentYear} $SNAIL. This is a meme token for entertainment purposes only.
        </p>
        <p className="font-body text-[10px] text-muted-foreground/40 mt-2 max-w-md mx-auto">
          Disclaimer: $SNAIL is not affiliated with, endorsed by, or connected to Nelvana Limited, 
          Franklin Productions, or any owners of the Franklin™ franchise. All Franklin™ characters 
          and related intellectual property belong to their respective owners.
        </p>
      </div>
    </footer>
  );
};
