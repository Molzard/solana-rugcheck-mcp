import {
  CheckRugResult,
  CrossSignals,
  MarketDataResult,
  RugCheckRisk,
  RugCheckSummaryResponse,
  RugFlags,
  Verdict
} from "../types/index.js";

/**
 * Evaluates RugCheck summary into normalized flags, notes, and strict verdict.
 * Rule:
 * - Danger if mint or freeze authority is active, or any high danger risk is flagged.
 * - Warning if LP locked is under 50 percent, high concentration detected, or report data missing/empty.
 * - Good otherwise.
 * - If data is missing or empty, return Warning, never Good.
 */
export function evaluateRugReport(mint: string, report: RugCheckSummaryResponse): CheckRugResult {
  const risks = Array.isArray(report.risks) ? report.risks : [];
  const notes: string[] = [];

  let mintAuthorityEnabled = false;
  let freezeAuthorityEnabled = false;
  let topHoldersConcentration = false;
  let hasDangerRisk = false;

  const isDataMissingOrEmpty =
    risks.length === 0 &&
    (report.score === 0 || report.score === 1) &&
    report.lpLockedPct === 0 &&
    !report.tokenProgram;

  const isUnindexedFallback = risks.some((r) => r.name === "Report Unavailable");

  for (const risk of risks) {
    const nameLower = (risk.name || "").toLowerCase();
    const descLower = (risk.description || "").toLowerCase();
    const levelLower = (risk.level || "").toLowerCase();

    if (levelLower === "danger") {
      hasDangerRisk = true;
      notes.push(`Danger flag detected: ${risk.name}`);
    }

    // Check mint authority
    if (
      nameLower.includes("mint authority") ||
      (nameLower.includes("mint") && (descLower.includes("enabled") || descLower.includes("active")))
    ) {
      mintAuthorityEnabled = true;
      notes.push("Mint authority is still active (unlimited supply risk)");
    }

    // Check freeze authority
    if (
      nameLower.includes("freeze authority") ||
      (nameLower.includes("freeze") && (descLower.includes("enabled") || descLower.includes("active")))
    ) {
      freezeAuthorityEnabled = true;
      notes.push("Freeze authority is active (wallet freezing risk)");
    }

    // Check holder concentration
    if (
      nameLower.includes("holder") ||
      nameLower.includes("concentration") ||
      descLower.includes("concentration") ||
      descLower.includes("top holders") ||
      nameLower.includes("single holder")
    ) {
      topHoldersConcentration = true;
      notes.push(`High holder concentration: ${risk.name}`);
    }
  }

  const lpLockedPct = typeof report.lpLockedPct === "number" ? report.lpLockedPct : 0;
  if (lpLockedPct < 50) {
    notes.push(`Low LP lock percentage: ${lpLockedPct.toFixed(2)}% (under 50% threshold)`);
  }

  const flags: RugFlags = {
    mintAuthorityEnabled,
    freezeAuthorityEnabled,
    lpLockedPct,
    topHoldersConcentration
  };

  let verdict: Verdict;

  if (mintAuthorityEnabled || freezeAuthorityEnabled || hasDangerRisk) {
    verdict = "Danger";
  } else if (isDataMissingOrEmpty || isUnindexedFallback || lpLockedPct < 50 || topHoldersConcentration) {
    verdict = "Warning";
    if (isDataMissingOrEmpty || isUnindexedFallback) {
      notes.push("Report data is unindexed, missing, or empty; assigned cautious Warning verdict");
    }
  } else {
    verdict = "Good";
    notes.push("No critical danger flags, adequate LP locked (>= 50%), and clean authorities");
  }

  return {
    mint,
    fetchedAt: new Date().toISOString(),
    verdict,
    rugScore: {
      raw: report.score ?? 0,
      normalised: report.score_normalised ?? 0,
      direction: "higher_is_riskier"
    },
    flags,
    risks,
    notes
  };
}

/**
 * Computes cross-signals between market data and rug check.
 */
export function computeCrossSignals(
  rug: CheckRugResult | null,
  market: MarketDataResult | null
): CrossSignals {
  const liquidityUsd = market?.liquidityUsd ?? 0;
  const fdvUsd = market?.fdvUsd ?? null;

  // Under $10,000 USD is considered low liquidity for SPL trading
  const lowLiquidity = liquidityUsd < 10000;

  let liquidityVsFdvRatio: number | null = null;
  if (typeof liquidityUsd === "number" && typeof fdvUsd === "number" && fdvUsd > 0) {
    liquidityVsFdvRatio = parseFloat((liquidityUsd / fdvUsd).toFixed(6));
  }

  return {
    lowLiquidity,
    liquidityVsFdvRatio
  };
}

/**
 * Computes overall comprehensive verdict.
 */
export function computeOverallVerdict(
  rug: CheckRugResult | null,
  market: MarketDataResult | null,
  crossSignals: CrossSignals,
  hasErrors: boolean
): Verdict {
  if (rug?.verdict === "Danger") {
    return "Danger";
  }

  if (hasErrors || !rug || !market) {
    return "Warning";
  }

  if (rug.verdict === "Warning" || crossSignals.lowLiquidity) {
    return "Warning";
  }

  return "Good";
}
