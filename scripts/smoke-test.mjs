#!/usr/bin/env node

import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = resolve(__dirname, "../dist/index.js");

console.error("[Smoke Test] Spawning MCP server at:", serverPath);

const child = spawn("node", [serverPath], {
  stdio: ["pipe", "pipe", "pipe"]
});

let stdoutNonJsonPollution = false;
const stdoutLines = [];
const pendingRequests = new Map();
let nextRequestId = 1;

// Monitor stderr (logs should go here)
child.stderr.on("data", (chunk) => {
  process.stderr.write(`[SERVER STDERR] ${chunk}`);
});

// Monitor stdout (STRICT: only valid JSON-RPC allowed)
const rl = readline.createInterface({
  input: child.stdout,
  crlfDelay: Infinity
});

rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const json = JSON.parse(trimmed);
    stdoutLines.push(json);

    if (json.id && pendingRequests.has(json.id)) {
      const { resolve } = pendingRequests.get(json.id);
      pendingRequests.delete(json.id);
      resolve(json);
    }
  } catch (err) {
    stdoutNonJsonPollution = true;
    console.error(`[FATAL] Non-JSON stdout detected: "${line}"`);
  }
});

function sendRequest(method, params) {
  return new Promise((resolve, reject) => {
    const id = nextRequestId++;
    const message = {
      jsonrpc: "2.0",
      id,
      method,
      params
    };

    pendingRequests.set(id, { resolve, reject });
    child.stdin.write(JSON.stringify(message) + "\n");

    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error(`Timeout waiting for response to ${method} (id=${id})`));
      }
    }, 15000);
  });
}

function sendNotification(method, params) {
  const message = {
    jsonrpc: "2.0",
    method,
    params
  };
  child.stdin.write(JSON.stringify(message) + "\n");
}

async function run() {
  try {
    // 1. Initialize
    console.error("[1/6] Sending initialize handshake...");
    const initRes = await sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "smoke-test", version: "1.0.0" }
    });

    if (!initRes.result?.capabilities?.tools) {
      throw new Error(`Initialize failed: missing tools capability in ${JSON.stringify(initRes)}`);
    }
    console.error(" -> Handshake succeeded.");

    sendNotification("notifications/initialized", {});

    // 2. List tools
    console.error("[2/6] Sending tools/list...");
    const listRes = await sendRequest("tools/list", {});
    const tools = listRes.result?.tools || [];
    const toolNames = tools.map((t) => t.name);
    console.error(" -> Discovered tools:", toolNames);

    const requiredTools = ["check_solana_rug", "get_solana_market_data", "audit_token_comprehensive"];
    for (const req of requiredTools) {
      if (!toolNames.includes(req)) {
        throw new Error(`Required tool missing: ${req}`);
      }
    }

    // 3. Test Invalid Address Handling
    console.error("[3/6] Testing invalid address validation...");
    const invalidRes = await sendRequest("tools/call", {
      name: "check_solana_rug",
      arguments: { mintAddress: "not-a-valid-solana-address" }
    });

    if (!invalidRes.result?.isError) {
      throw new Error(`Expected isError: true on invalid address, got: ${JSON.stringify(invalidRes)}`);
    }
    const errContent = JSON.parse(invalidRes.result.content[0].text);
    if (errContent.code !== "INVALID_ADDRESS") {
      throw new Error(`Expected INVALID_ADDRESS code, got: ${errContent.code}`);
    }
    console.error(" -> Invalid address rejected cleanly with INVALID_ADDRESS.");

    // 4. Test check_solana_rug on USDC
    const usdcMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    console.error(`[4/6] Calling check_solana_rug for USDC (${usdcMint})...`);
    const rugRes = await sendRequest("tools/call", {
      name: "check_solana_rug",
      arguments: { mintAddress: usdcMint }
    });

    if (rugRes.result?.isError) {
      throw new Error(`check_solana_rug returned error: ${JSON.stringify(rugRes)}`);
    }
    const rugParsed = JSON.parse(rugRes.result.content[0].text);
    console.error(" -> Rug check verdict:", rugParsed.verdict, "Score:", rugParsed.rugScore);

    // 5. Test get_solana_market_data on USDC
    console.error(`[5/6] Calling get_solana_market_data for USDC...`);
    const marketRes = await sendRequest("tools/call", {
      name: "get_solana_market_data",
      arguments: { mintAddress: usdcMint }
    });

    if (marketRes.result?.isError) {
      throw new Error(`get_solana_market_data returned error: ${JSON.stringify(marketRes)}`);
    }
    const marketParsed = JSON.parse(marketRes.result.content[0].text);
    console.error(" -> Market best DEX:", marketParsed.dexId, "Liquidity USD:", marketParsed.liquidityUsd);

    // 6. Test audit_token_comprehensive on USDC
    console.error(`[6/6] Calling audit_token_comprehensive for USDC...`);
    const auditRes = await sendRequest("tools/call", {
      name: "audit_token_comprehensive",
      arguments: { mintAddress: usdcMint }
    });

    if (auditRes.result?.isError) {
      throw new Error(`audit_token_comprehensive returned error: ${JSON.stringify(auditRes)}`);
    }
    const auditParsed = JSON.parse(auditRes.result.content[0].text);
    console.error(" -> Overall verdict:", auditParsed.overallVerdict);
    console.error(" -> Summary for agent:", auditParsed.summaryForAgent);

    // Teardown
    console.error("[Verification] Checking stdout purity...");
    if (stdoutNonJsonPollution) {
      throw new Error("STDOUT POLLUTION DETECTED: Non-JSON-RPC lines were printed to stdout!");
    }
    console.error(" -> Stdout is 100% pure JSON-RPC.");

    console.error("[Teardown] Sending SIGINT to child server...");
    child.kill("SIGINT");

    await new Promise((resolve) => child.on("exit", resolve));
    console.error("[PASS] Smoke test completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("[FAIL] Smoke test failed:", error);
    child.kill("SIGKILL");
    process.exit(1);
  }
}

run();
