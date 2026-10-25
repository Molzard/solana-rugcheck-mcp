export const RUGCHECK_BASE_URL = "https://api.rugcheck.xyz/v1";
export const DEXSCREENER_BASE_URL = "https://api.dexscreener.com/latest/dex";

export const DEFAULT_TIMEOUT_MS = 8000;
export const DEFAULT_CACHE_TTL_MS = 30000;
export const USER_AGENT = "solana-rugcheck-mcp/1.0.0 (+https://github.com/solana-rugcheck-mcp)";

export const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const SOLANA_CHAIN_ID = "solana";

export const ERROR_CODES = {
  INVALID_ADDRESS: "INVALID_ADDRESS",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  TIMEOUT: "TIMEOUT",
  UPSTREAM_ERROR: "UPSTREAM_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR"
} as const;
