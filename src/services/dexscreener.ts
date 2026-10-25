import { DEXSCREENER_BASE_URL, SOLANA_CHAIN_ID } from "../config/constants.js";
import { fetchJson } from "../lib/http.js";
import { globalCache } from "../lib/cache.js";
import { NotFoundError } from "../lib/errors.js";
import { DexScreenerResponse, DexScreenerPair, MarketDataResult } from "../types/index.js";

const CACHE_PREFIX = "dexscreener:";

export class DexScreenerService {
  async getMarketData(mint: string): Promise<MarketDataResult> {
    const cacheKey = `${CACHE_PREFIX}${mint}`;
    const cached = globalCache.get<MarketDataResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const url = `${DEXSCREENER_BASE_URL}/tokens/${encodeURIComponent(mint)}`;
    const response = await fetchJson<DexScreenerResponse>(url);

    const allPairs = response.pairs || [];
    const solanaPairs = allPairs.filter(
      (pair: DexScreenerPair) => pair.chainId && pair.chainId.toLowerCase() === SOLANA_CHAIN_ID
    );

    if (solanaPairs.length === 0) {
      throw new NotFoundError(`No Solana liquidity pairs found on DexScreener for mint: ${mint}`, {
        mint,
        pairsFound: 0
      });
    }

    // Sort descending by liquidity.usd
    solanaPairs.sort((a, b) => {
      const liqA = typeof a.liquidity?.usd === "number" ? a.liquidity.usd : 0;
      const liqB = typeof b.liquidity?.usd === "number" ? b.liquidity.usd : 0;
      return liqB - liqA;
    });

    const best = solanaPairs[0];

    const result: MarketDataResult = {
      mint,
      fetchedAt: new Date().toISOString(),
      priceUsd: best.priceUsd ?? null,
      volume24hUsd: typeof best.volume?.h24 === "number" ? best.volume.h24 : null,
      liquidityUsd: typeof best.liquidity?.usd === "number" ? best.liquidity.usd : null,
      fdvUsd: typeof best.fdv === "number" ? best.fdv : null,
      marketCapUsd: typeof best.marketCap === "number" ? best.marketCap : null,
      priceChange24hPct: typeof best.priceChange?.h24 === "number" ? best.priceChange.h24 : null,
      pairAddress: best.pairAddress,
      dexId: best.dexId,
      dexUrl: best.url,
      baseToken: {
        address: best.baseToken.address,
        name: best.baseToken.name,
        symbol: best.baseToken.symbol
      },
      quoteToken: {
        address: best.quoteToken.address,
        name: best.quoteToken.name,
        symbol: best.quoteToken.symbol
      },
      pairsFound: solanaPairs.length
    };

    globalCache.set(cacheKey, result);
    return result;
  }
}

export const dexScreenerService = new DexScreenerService();
