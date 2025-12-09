import { useEffect, useState } from "react";

interface MarketData {
  marketCap: number | null;
  priceUsd: string | null;
  priceChange24h: number | null;
  isLoading: boolean;
}

const TOKEN_ADDRESS = "5t4VZ55DuoEKsChjNgFTb6Rampsk3tLuVus2RVHmpump";

// Shared state across components
let cachedData: MarketData = {
  marketCap: null,
  priceUsd: null,
  priceChange24h: null,
  isLoading: true,
};

let listeners: Set<() => void> = new Set();
let fetchInterval: ReturnType<typeof setInterval> | null = null;

const fetchMarketData = async () => {
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${TOKEN_ADDRESS}`
    );
    const data = await response.json();
    if (data.pairs && data.pairs.length > 0) {
      const pair = data.pairs[0];
      cachedData = {
        marketCap: pair.marketCap || pair.fdv,
        priceUsd: pair.priceUsd,
        priceChange24h: pair.priceChange?.h24 || null,
        isLoading: false,
      };
    } else {
      cachedData = { ...cachedData, isLoading: false };
    }
  } catch (error) {
    console.error("Failed to fetch market data:", error);
    cachedData = { ...cachedData, isLoading: false };
  }
  listeners.forEach((listener) => listener());
};

export const useMarketData = (): MarketData => {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const listener = () => forceUpdate({});
    listeners.add(listener);

    // Start fetching if this is the first subscriber
    if (listeners.size === 1) {
      fetchMarketData();
      fetchInterval = setInterval(fetchMarketData, 30000);
    }

    return () => {
      listeners.delete(listener);
      // Stop fetching if no more subscribers
      if (listeners.size === 0 && fetchInterval) {
        clearInterval(fetchInterval);
        fetchInterval = null;
      }
    };
  }, []);

  return cachedData;
};

export const formatMarketCap = (value: number) => {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
};
