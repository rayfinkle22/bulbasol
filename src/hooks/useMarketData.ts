import { useEffect, useState } from "react";

interface TransactionData {
  buys: number;
  sells: number;
}

interface PriceChangeData {
  m5: number | null;
  h1: number | null;
  h6: number | null;
  h24: number | null;
}

interface VolumeData {
  m5: number | null;
  h1: number | null;
  h6: number | null;
  h24: number | null;
}

interface MarketData {
  marketCap: number | null;
  priceUsd: string | null;
  priceNative: string | null;
  priceChange: PriceChangeData;
  volume: VolumeData;
  liquidityUsd: number | null;
  txns24h: TransactionData | null;
  txns1h: TransactionData | null;
  pairCreatedAt: number | null;
  dexId: string | null;
  isLoading: boolean;
}

const TOKEN_ADDRESS = "61z3QXMxs41E2dniUxZYf4PFXk6fFw4Wai9NNuZtqPE9";

let cachedData: MarketData = {
  marketCap: null,
  priceUsd: null,
  priceNative: null,
  priceChange: { m5: null, h1: null, h6: null, h24: null },
  volume: { m5: null, h1: null, h6: null, h24: null },
  liquidityUsd: null,
  txns24h: null,
  txns1h: null,
  pairCreatedAt: null,
  dexId: null,
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
      const pair = data.pairs.find((p: any) => p.dexId === "pumpswap") || data.pairs[0];
      
      cachedData = {
        marketCap: pair.marketCap || pair.fdv,
        priceUsd: pair.priceUsd,
        priceNative: pair.priceNative,
        priceChange: {
          m5: pair.priceChange?.m5 ?? null,
          h1: pair.priceChange?.h1 ?? null,
          h6: pair.priceChange?.h6 ?? null,
          h24: pair.priceChange?.h24 ?? null,
        },
        volume: {
          m5: pair.volume?.m5 ?? null,
          h1: pair.volume?.h1 ?? null,
          h6: pair.volume?.h6 ?? null,
          h24: pair.volume?.h24 ?? null,
        },
        liquidityUsd: pair.liquidity?.usd ?? null,
        txns24h: pair.txns?.h24 ?? null,
        txns1h: pair.txns?.h1 ?? null,
        pairCreatedAt: pair.pairCreatedAt ?? null,
        dexId: pair.dexId ?? null,
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

    if (listeners.size === 1) {
      fetchMarketData();
      fetchInterval = setInterval(fetchMarketData, 30000);
    }

    return () => {
      listeners.delete(listener);
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

export const formatVolume = (value: number) => {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
};

export const formatAge = (timestamp: number) => {
  const now = Date.now();
  const ageMs = now - timestamp;
  const hours = Math.floor(ageMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} old`;
  }
  return `${hours} hour${hours !== 1 ? 's' : ''} old`;
};
