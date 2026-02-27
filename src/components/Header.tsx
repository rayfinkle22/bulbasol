import { Link, useLocation } from "react-router-dom";
import { useMarketData, formatMarketCap } from "@/hooks/useMarketData";

export const Header = () => {
  const { marketCap, isLoading } = useMarketData();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur border-b-4 border-primary/30">
      <div className="max-w-6xl mx-auto px-3 py-2 sm:py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="text-xl sm:text-2xl">🌿</span>
              <span className="font-display text-xl sm:text-2xl font-bold text-primary">BulbaSol</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-2">
              <Link 
                to="/" 
                className={`font-display text-sm px-3 py-1 rounded-lg transition-colors ${
                  location.pathname === '/' 
                    ? 'bg-primary/20 text-primary' 
                    : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                }`}
              >
                Home
              </Link>
              <Link 
                to="/legacy" 
                className={`font-display text-sm px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                  location.pathname === '/legacy' 
                    ? 'bg-muted text-muted-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                🎮 Legacy Game
              </Link>
              <Link 
                to="/security" 
                className={`font-display text-sm px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                  location.pathname === '/security' 
                    ? 'bg-primary/20 text-primary' 
                    : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                }`}
              >
                🔒 Security
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              to="/legacy" 
              className={`sm:hidden font-display text-xs px-2 py-1 rounded-lg ${
                location.pathname === '/legacy' 
                  ? 'bg-muted text-muted-foreground' 
                  : 'text-muted-foreground/70'
              }`}
            >
              🎮
            </Link>
            <Link 
              to="/security" 
              className={`sm:hidden font-display text-xs px-2 py-1 rounded-lg ${
                location.pathname === '/security' 
                  ? 'bg-primary/20 text-primary' 
                  : 'text-muted-foreground/70'
              }`}
            >
              🔒
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-body text-xs sm:text-sm text-muted-foreground">MCap:</span>
              <span className="font-display text-sm sm:text-lg text-accent">
                {isLoading ? (
                  <span className="animate-pulse">...</span>
                ) : marketCap ? (
                  formatMarketCap(marketCap)
                ) : (
                  "N/A"
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
