export const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="py-8 px-4 border-t border-border">
      <div className="max-w-4xl mx-auto text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-3xl">🐌</span>
          <span className="font-display text-2xl text-accent">$SNAIL</span>
        </div>
        
        <p className="font-body text-muted-foreground mb-4">
          Slow and steady. Just like Franklin's best friend.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 mb-6 text-sm font-body">
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
        
        <p className="font-body text-sm text-muted-foreground/60">
          © {currentYear} $SNAIL. This is a meme token for entertainment purposes.
          <br />
          Not affiliated with Franklin the Turtle or its creators.
        </p>
      </div>
    </footer>
  );
};
