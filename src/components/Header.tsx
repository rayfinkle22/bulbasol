import { Link, useLocation } from "react-router-dom";
import snailImage from "@/assets/snail.png";
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
              <img src={snailImage} alt="Snail" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
              <span className="font-display text-xl sm:text-2xl font-bold text-primary">$SNAIL</span>
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
                to="/testing" 
                className={`font-display text-sm px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                  location.pathname === '/testing' 
                    ? 'bg-yellow-500/20 text-yellow-500' 
                    : 'text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10'
                }`}
              >
                🧪 In Testing
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {/* Mobile nav */}
            <Link 
              to="/testing" 
              className={`sm:hidden font-display text-xs px-2 py-1 rounded-lg ${
                location.pathname === '/testing' 
                  ? 'bg-yellow-500/20 text-yellow-500' 
                  : 'text-yellow-500/70'
              }`}
            >
              🧪
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
