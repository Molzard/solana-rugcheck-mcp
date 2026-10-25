export type Verdict = "Good" | "Warning" | "Danger";

export interface RugCheckRisk {
  name: string;
  value: string;
  description: string;
  score: number;
  level: "warn" | "danger" | string;
}

export interface RugCheckSummaryResponse {
  tokenProgram?: string;
  tokenType?: string;
  risks: RugCheckRisk[];
  score: number;
  score_normalised: number;
  lpLockedPct: number;
}

export interface DexScreenerToken {
  address: string;
  name: string;
  symbol: string;
}

export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  labels?: string[];
  baseToken: DexScreenerToken;
  quoteToken: DexScreenerToken;
  priceNative?: string;
  priceUsd?: string;
  txns?: {
    m5?: { buys: number; sells: number };
    h1?: { buys: number; sells: number };
    h6?: { buys: number; sells: number };
    h24?: { buys: number; sells: number };
  };
  volume?: {
    m5?: number;
    h1?: number;
    h6?: number;
    h24?: number;
  };
  priceChange?: {
    m5?: number;
    h1?: number;
    h6?: number;
    h24?: number;
  };
  liquidity?: {
    usd?: number;
    base?: number;
    quote?: number;
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
}

export interface DexScreenerResponse {
  schemaVersion?: string;
  pairs: DexScreenerPair[] | null;
}

export interface RugFlags {
  mintAuthorityEnabled: boolean;
  freezeAuthorityEnabled: boolean;
  lpLockedPct: number;
  topHoldersConcentration: boolean;
}

export interface RugScore {
  raw: number;
  normalised: number;
  direction: string;
}

export interface CheckRugResult {
  mint: string;
  fetchedAt: string;
  verdict: Verdict;
  rugScore: RugScore;
  flags: RugFlags;
  risks: RugCheckRisk[];
  notes: string[];
}

export interface MarketDataResult {
  mint: string;
  fetchedAt: string;
  priceUsd: string | null;
  volume24hUsd: number | null;
  liquidityUsd: number | null;
  fdvUsd: number | null;
  marketCapUsd: number | null;
  priceChange24hPct: number | null;
  pairAddress: string;
  dexId: string;
  dexUrl: string;
  baseToken: DexScreenerToken;
  quoteToken: DexScreenerToken;
  pairsFound: number;
}

export interface CrossSignals {
  lowLiquidity: boolean;
  liquidityVsFdvRatio: number | null;
}

export interface AuditComprehensiveResult {
  mint: string;
  fetchedAt: string;
  partial: boolean;
  rug: CheckRugResult | null;
  market: MarketDataResult | null;
  errors: Record<string, string> | null;
  crossSignals: CrossSignals;
  overallVerdict: Verdict;
  summaryForAgent: string;
}

export interface ToolErrorResponse {
  isError: true;
  code: string;
  message: string;
  details?: unknown;
  retryAfterSeconds?: number;
}
