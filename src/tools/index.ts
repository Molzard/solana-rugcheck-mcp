import { handleCheckSolanaRug } from "./checkSolanaRug.js";
import { handleGetSolanaMarketData } from "./getSolanaMarketData.js";
import { handleAuditTokenComprehensive } from "./auditTokenComprehensive.js";

export const TOOLS = [
  {
    name: "check_solana_rug",
    description:
      "Audit a Solana SPL token for rug risk using RugCheck. Returns risk score, mint/freeze authority status, LP lock percentage, top holder concentration, and safety verdict (Good, Warning, Danger).",
    inputSchema: {
      type: "object",
      properties: {
        mintAddress: {
          type: "string",
          description: "Solana SPL token mint address in Base58 format (32-44 chars, 32 bytes)"
        }
      },
      required: ["mintAddress"]
    }
  },
  {
    name: "get_solana_market_data",
    description:
      "Fetch real-time Solana DEX market data from DexScreener for a token mint. Automatically selects the highest-liquidity Solana pool and returns price, 24h volume, liquidity USD, FDV, market cap, and pair URLs.",
    inputSchema: {
      type: "object",
      properties: {
        mintAddress: {
          type: "string",
          description: "Solana SPL token mint address in Base58 format (32-44 chars, 32 bytes)"
        }
      },
      required: ["mintAddress"]
    }
  },
  {
    name: "audit_token_comprehensive",
    description:
      "Perform a full concurrent security and market audit for a Solana SPL token. Queries both RugCheck and DexScreener in parallel, cross-correlates liquidity vs FDV, flags low liquidity, and returns an overall verdict with agent summary.",
    inputSchema: {
      type: "object",
      properties: {
        mintAddress: {
          type: "string",
          description: "Solana SPL token mint address in Base58 format (32-44 chars, 32 bytes)"
        }
      },
      required: ["mintAddress"]
    }
  }
] as const;

export async function dispatchToolCall(name: string, args: unknown) {
  switch (name) {
    case "check_solana_rug":
      return await handleCheckSolanaRug(args);
    case "get_solana_market_data":
      return await handleGetSolanaMarketData(args);
    case "audit_token_comprehensive":
      return await handleAuditTokenComprehensive(args);
    default:
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                isError: true,
                code: "UNKNOWN_TOOL",
                message: `Tool '${name}' is not recognized by this server`
              },
              null,
              2
            )
          }
        ]
      };
  }
}
