export const DexChart = () => {
  return (
    <section className="py-8 sm:py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-display text-3xl sm:text-4xl text-center text-primary mb-2">
          Live Chart 📈
        </h2>
        <p className="font-body text-center text-muted-foreground mb-6">
          Track $SNAIL in real-time on Dexscreener
        </p>
        
        <div className="rounded-2xl retro-border overflow-hidden bg-card">
          <iframe
            src="https://dexscreener.com/solana/5t4VZ55DuoEKsChjNgFTb6Rampsk3tLuVus2RVHmpump?embed=1&theme=dark&trades=0&info=0"
            title="$SNAIL Dexscreener Chart"
            className="w-full border-0"
            style={{ height: 400 }}
          />
        </div>
        
        <p className="text-center mt-4">
          <a 
            href="https://dexscreener.com/solana/5t4VZ55DuoEKsChjNgFTb6Rampsk3tLuVus2RVHmpump" 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-body text-accent hover:text-primary transition-colors inline-flex items-center gap-2"
          >
            View full chart on Dexscreener →
          </a>
        </p>
      </div>
    </section>
  );
};
