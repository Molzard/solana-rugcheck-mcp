import { rugCheckService } from "../services/rugcheck.js";
import { dexScreenerService } from "../services/dexscreener.js";
import { validateMintAddress } from "../lib/validation.js";
import { computeCrossSignals, computeOverallVerdict, evaluateRugReport } from "./verdict.js";
import { formatErrorResponse } from "../lib/errors.js";
import {
  AuditComprehensiveResult,
  CheckRugResult,
  MarketDataResult
} from "../types/index.js";

export async function handleAuditTokenComprehensive(args: unknown) {
  try {
    const mint = validateMintAddress(args);
    const fetchedAt = new Date().toISOString();

    const [rugSettled, marketSettled] = await Promise.allSettled([
      rugCheckService.getSummary(mint),
      dexScreenerService.getMarketData(mint)
    ]);

    let rug: CheckRugResult | null = null;
    let market: MarketDataResult | null = null;
    const errors: Record<string, string> = {};

    if (rugSettled.status === "fulfilled") {
      rug = evaluateRugReport(mint, rugSettled.value);
    } else {
      errors.rug =
        rugSettled.reason instanceof Error
          ? rugSettled.reason.message
          : String(rugSettled.reason);
    }

    if (marketSettled.status === "fulfilled") {
      market = marketSettled.value;
    } else {
      errors.market =
        marketSettled.reason instanceof Error
          ? marketSettled.reason.message
          : String(marketSettled.reason);
    }

    const hasErrors = Object.keys(errors).length > 0;
    const partial = hasErrors && (rug !== null || market !== null);

    // If both failed completely, return structured error
    if (!rug && !market) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                isError: true,
                code: "UPSTREAM_ERROR",
                message: "Failed to audit token: both RugCheck and DexScreener calls failed",
                details: errors
              },
              null,
              2
            )
          }
        ]
      };
    }

    const crossSignals = computeCrossSignals(rug, market);
    const overallVerdict = computeOverallVerdict(rug, market, crossSignals, hasErrors);

    // Build concise agent summary
    const summaryParts: string[] = [
      `Overall Verdict: ${overallVerdict}.`
    ];

    if (rug) {
      summaryParts.push(
        `RugCheck Score: ${rug.rugScore.raw} (${rug.verdict}), LP Locked: ${rug.flags.lpLockedPct.toFixed(1)}%.`
      );
      if (rug.flags.mintAuthorityEnabled) {
        summaryParts.push("CRITICAL: Mint authority is active!");
      }
      if (rug.flags.freezeAuthorityEnabled) {
        summaryParts.push("CRITICAL: Freeze authority is active!");
      }
    } else if (errors.rug) {
      summaryParts.push(`RugCheck inspection unavailable (${errors.rug}).`);
    }

    if (market) {
      const liq = market.liquidityUsd !== null ? `$${market.liquidityUsd.toLocaleString()}` : "N/A";
      const vol = market.volume24hUsd !== null ? `$${market.volume24hUsd.toLocaleString()}` : "N/A";
      const mc = market.marketCapUsd !== null ? `$${market.marketCapUsd.toLocaleString()}` : "N/A";
      summaryParts.push(
        `Market: Best DEX pair on ${market.dexId.toUpperCase()} with ${liq} liquidity, 24h Vol ${vol}, MC ${mc}.`
      );
      if (crossSignals.lowLiquidity) {
        summaryParts.push("WARNING: Low liquidity pool (< $10k USD).");
      }
    } else if (errors.market) {
      summaryParts.push(`Market data unavailable (${errors.market}).`);
    }

    const result: AuditComprehensiveResult = {
      mint,
      fetchedAt,
      partial,
      rug,
      market,
      errors: hasErrors ? errors : null,
      crossSignals,
      overallVerdict,
      summaryForAgent: summaryParts.join(" ")
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    const errorPayload = formatErrorResponse(error);
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify(errorPayload, null, 2)
        }
      ]
    };
  }
}
