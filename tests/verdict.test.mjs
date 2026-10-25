import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateRugReport,
  computeCrossSignals,
  computeOverallVerdict
} from "../dist/tools/verdict.js";

const TEST_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

test("Verdict - Evaluates Good for clean token with LP locked >= 50%", () => {
  const result = evaluateRugReport(TEST_MINT, {
    tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    risks: [],
    score: 1,
    score_normalised: 1,
    lpLockedPct: 85.5
  });

  assert.equal(result.verdict, "Good");
  assert.equal(result.flags.mintAuthorityEnabled, false);
  assert.equal(result.flags.freezeAuthorityEnabled, false);
  assert.equal(result.flags.lpLockedPct, 85.5);
});

test("Verdict - Evaluates Danger on Active Mint Authority", () => {
  const result = evaluateRugReport(TEST_MINT, {
    tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    risks: [
      {
        name: "Mint Authority still enabled",
        value: "active",
        description: "Owner can mint unlimited tokens",
        score: 500,
        level: "danger"
      }
    ],
    score: 500,
    score_normalised: 50,
    lpLockedPct: 100
  });

  assert.equal(result.verdict, "Danger");
  assert.equal(result.flags.mintAuthorityEnabled, true);
});

test("Verdict - Evaluates Danger on Active Freeze Authority", () => {
  const result = evaluateRugReport(TEST_MINT, {
    tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    risks: [
      {
        name: "Freeze Authority still enabled",
        value: "active",
        description: "Owner can freeze token accounts",
        score: 500,
        level: "danger"
      }
    ],
    score: 500,
    score_normalised: 50,
    lpLockedPct: 100
  });

  assert.equal(result.verdict, "Danger");
  assert.equal(result.flags.freezeAuthorityEnabled, true);
});

test("Verdict - Evaluates Danger on any Danger-level Risk", () => {
  const result = evaluateRugReport(TEST_MINT, {
    tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    risks: [
      {
        name: "Honeypot code detected",
        value: "",
        description: "Token transfers are maliciously blocked",
        score: 1000,
        level: "danger"
      }
    ],
    score: 1000,
    score_normalised: 95,
    lpLockedPct: 100
  });

  assert.equal(result.verdict, "Danger");
});

test("Verdict - Evaluates Warning when LP locked < 50%", () => {
  const result = evaluateRugReport(TEST_MINT, {
    tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    risks: [],
    score: 1,
    score_normalised: 1,
    lpLockedPct: 25.0
  });

  assert.equal(result.verdict, "Warning");
  assert.equal(result.flags.lpLockedPct, 25.0);
});

test("Verdict - Evaluates Warning on Top Holder Concentration", () => {
  const result = evaluateRugReport(TEST_MINT, {
    tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    risks: [
      {
        name: "Top 10 holders high concentration",
        value: "75%",
        description: "Top 10 holders control over 70% of supply",
        score: 150,
        level: "warn"
      }
    ],
    score: 151,
    score_normalised: 12,
    lpLockedPct: 90
  });

  assert.equal(result.verdict, "Warning");
  assert.equal(result.flags.topHoldersConcentration, true);
});

test("Verdict - Missing or Empty Data returns Warning, never Good", () => {
  const result = evaluateRugReport(TEST_MINT, {
    risks: [],
    score: 0,
    score_normalised: 0,
    lpLockedPct: 0
  });

  assert.equal(result.verdict, "Warning");
});

test("Cross Signals and Overall Verdict", () => {
  const rugGood = evaluateRugReport(TEST_MINT, {
    tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    risks: [],
    score: 1,
    score_normalised: 1,
    lpLockedPct: 100
  });

  const marketHealthy = {
    mint: TEST_MINT,
    fetchedAt: new Date().toISOString(),
    priceUsd: "1.00",
    volume24hUsd: 500000,
    liquidityUsd: 150000,
    fdvUsd: 1500000,
    marketCapUsd: 1500000,
    priceChange24hPct: 2.5,
    pairAddress: "PAIR_ADDR",
    dexId: "raydium",
    dexUrl: "https://dexscreener.com",
    baseToken: { address: TEST_MINT, name: "USDC", symbol: "USDC" },
    quoteToken: { address: "So11111111111111111111111111111111111111112", name: "SOL", symbol: "SOL" },
    pairsFound: 5
  };

  const signals = computeCrossSignals(rugGood, marketHealthy);
  assert.equal(signals.lowLiquidity, false);
  assert.equal(signals.liquidityVsFdvRatio, 0.1);

  const overall = computeOverallVerdict(rugGood, marketHealthy, signals, false);
  assert.equal(overall, "Good");

  // Low liquidity triggers warning
  const marketLowLiq = { ...marketHealthy, liquidityUsd: 2500 };
  const lowSignals = computeCrossSignals(rugGood, marketLowLiq);
  assert.equal(lowSignals.lowLiquidity, true);
  const overallLow = computeOverallVerdict(rugGood, marketLowLiq, lowSignals, false);
  assert.equal(overallLow, "Warning");
});
