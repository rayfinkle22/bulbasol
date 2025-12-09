import { useEffect, useState } from "react";

export const DexChart = () => {
  const [marketCap, setMarketCap] = useState<number | null>(null);
  const [priceUsd, setPriceUsd] = useState<string | null>(null);
  const [priceChange24h, setPriceChange24h] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const TOKEN_ADDRESS = "5t4VZ55DuoEKsChjNgFTb6Rampsk3tLuVus2RVHmpump";

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${TOKEN_ADDRESS}`
        );
        const data = await response.json();
        if (data.pairs && data.pairs.length > 0) {
          const pair = data.pairs[0];
          setMarketCap(pair.marketCap || pair.fdv);
          setPriceUsd(pair.priceUsd);
          setPriceChange24h(pair.priceChange?.h24 || null);
        }
      } catch (error) {
        console.error("Failed to fetch market data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatMarketCap = (value: number) => {
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    } else if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  return (
    <section className="py-8 sm:py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-display text-3xl sm:text-4xl text-center text-primary mb-2">
          Live Chart 📈
        </h2>
        <p className="font-body text-center text-muted-foreground mb-6">
          Track $SNAIL in real-time on Dexscreener
        </p>

        {/* Market Cap Display */}
        <div className="mb-6 p-4 rounded-2xl retro-border bg-card">
          <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
            <div className="text-center">
              <p className="font-body text-sm text-muted-foreground mb-1">Market Cap</p>
              <p className="font-display text-2xl sm:text-3xl text-primary">
                {isLoading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : marketCap ? (
                  formatMarketCap(marketCap)
                ) : (
                  "N/A"
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="font-body text-sm text-muted-foreground mb-1">Price</p>
              <p className="font-display text-2xl sm:text-3xl text-accent">
                {isLoading ? (
                  <span className="animate-pulse">...</span>
                ) : priceUsd ? (
                  `$${parseFloat(priceUsd).toFixed(8)}`
                ) : (
                  "N/A"
                )}
              </p>
            </div>
            {priceChange24h !== null && (
              <div className="text-center">
                <p className="font-body text-sm text-muted-foreground mb-1">24h Change</p>
                <p className={`font-display text-2xl sm:text-3xl ${priceChange24h >= 0 ? 'text-game-ground-light' : 'text-destructive'}`}>
                  {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
                </p>
              </div>
            )}
          </div>
        </div>
        
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
        
        <div className="mt-8 rounded-2xl retro-border overflow-hidden">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full"
          >
            <source src="/videos/snail-animation.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </section>
  );
};
