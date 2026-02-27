export const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="py-6 px-4 border-t border-border bg-card/50">
      <div className="max-w-4xl mx-auto text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="text-2xl">🌿</span>
          <span className="font-display text-xl text-primary font-bold">BulbaSol</span>
        </div>
        
        <p className="font-body text-muted-foreground mb-3 text-sm">
          The First Pokémon Coin on Pump.fun 🚀
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
            href="https://x.com/i/communities/1964682176819040605" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-accent transition-colors"
          >
            X Community
          </a>
        </div>
        
        <p className="font-body text-xs text-muted-foreground/60">
          © {currentYear} BulbaSol. This is a meme token for entertainment purposes only.
        </p>
        <p className="font-body text-[10px] text-muted-foreground/40 mt-2 max-w-md mx-auto">
          Disclaimer: BulbaSol is not affiliated with, endorsed by, or connected to Nintendo, 
          Game Freak, The Pokémon Company, or any owners of the Pokémon™ franchise. All Pokémon™ characters 
          and related intellectual property belong to their respective owners.
        </p>
      </div>
    </footer>
  );
};
