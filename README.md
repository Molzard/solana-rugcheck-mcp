# solana-rugcheck-mcp

A production-grade Model Context Protocol (MCP) server written in TypeScript (ESM) that enables AI agents (Claude Desktop, Cursor, Hermes Agent) to audit Solana SPL tokens and retrieve real-time DEX market telemetry using **100% free, keyless public APIs**.

---

## Features

- **Empirical Token Safety Audits**: Real-time RugCheck report summaries including mint/freeze authority checks, LP lock percentages, and holder concentration flags.
- **Real-Time Solana Market Telemetry**: Queries DexScreener to isolate Solana pairs and identify the highest-liquidity pool for price, 24h volume, FDV, market cap, and DEX URLs.
- **Cross-Correlated Comprehensive Audits**: Runs security and liquidity scans concurrently via `Promise.allSettled`, analyzes liquidity vs. FDV ratios, flags low liquidity pools, and generates agent-ready summaries.
- **Strict Stdio Hygiene**: Adheres to the MCP stdio contract—**all** application logs, errors, and traces go to `stderr`. `stdout` carries only valid JSON-RPC frames.
- **Fast-Fail Base58 Validation**: All mint addresses are verified with regex and decoded with `bs58` to guarantee exactly 32-byte public keys before any network calls.
- **In-Memory TTL Cache**: 30-second sliding cache prevents duplicate external requests during multi-turn agent conversations.
- **Zero Paid Dependencies**: Requires no Solana RPC node, no paid API keys, and no wallet keys.

---

## Tools

### 1. `check_solana_rug`
Performs an on-chain security and risk analysis for a Solana token mint via RugCheck.

- **Parameters**:
  - `mintAddress` (`string`, required): Solana SPL token mint address (32–44 character Base58 string).
- **Verdict Rules**:
  - `Danger`: Mint authority enabled, freeze authority enabled, or any critical danger-level risk detected.
  - `Warning`: LP locked < 50%, top holder concentration detected, or missing/unindexed report data.
  - `Good`: Authorities revoked, LP locked >= 50%, low concentration, and low overall risk score.

### 2. `get_solana_market_data`
Fetches real-time DEX metrics from DexScreener, automatically selecting the pool on Solana with the highest USD liquidity.

- **Parameters**:
  - `mintAddress` (`string`, required): Solana SPL token mint address.
- **Output**:
  - Price (USD), 24h volume, USD liquidity, FDV, market cap, 24h price change %, DEX ID (Raydium, Orca, Meteora, etc.), pair address, and DexScreener URL.
  - Returns structured `NOT_FOUND` if no Solana trading pairs exist.

### 3. `audit_token_comprehensive`
Executes both `check_solana_rug` and `get_solana_market_data` concurrently.

- **Parameters**:
  - `mintAddress` (`string`, required): Solana SPL token mint address.
- **Output**:
  - Combined `rug` and `market` payloads.
  - `crossSignals`: Deterministic checks including `lowLiquidity` (< $10k USD) and `liquidityVsFdvRatio`.
  - `overallVerdict`: `Good` | `Warning` | `Danger`.
  - `summaryForAgent`: A crisp, one-paragraph synthesized briefing for the LLM.

---

## Installation & Build

### Prerequisites
- Node.js >= 18.0.0 (Recommended: Node 20 or 22)
- npm >= 9.0.0

```bash
git clone https://github.com/Molzard/solana-rugcheck-mcp.git
cd solana-rugcheck-mcp
npm install
npm run build
```

---

## Client Configuration

### 1. Claude Desktop
Add to your `claude_desktop_config.json`:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "solana-rugcheck": {
      "command": "node",
      "args": ["/path/to/solana-rugcheck-mcp/dist/index.js"]
    }
  }
}
```

### 2. Cursor
Add to your project's `.cursor/mcp.json` or user configuration:

```json
{
  "mcpServers": {
    "solana-rugcheck": {
      "command": "node",
      "args": ["/path/to/solana-rugcheck-mcp/dist/index.js"]
    }
  }
}
```

### 3. Hermes Agent
Add to `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  solana-rugcheck:
    command: "node"
    args:
      - "/path/to/solana-rugcheck-mcp/dist/index.js"
    env:
      NODE_ENV: "production"
```

Or register via the Hermes CLI:
```bash
hermes mcp add solana-rugcheck --command "node" --args "/path/to/solana-rugcheck-mcp/dist/index.js"
```

---

## Verification & Testing

### Unit Tests
Executes native Node.js test runner (`node:test`) verifying Base58 validation, error mapping, and verdict evaluation:
```bash
npm test
```

### End-to-End Stdio Smoke Test
Spawns the compiled server process, exercises the JSON-RPC initialization handshake, tools discovery, invalid input rejections, live token audits, and verifies **zero non-JSON stdout pollution**:
```bash
npm run smoke
```

---

## Project Structure

```
solana-rugcheck-mcp/
├── src/
│   ├── config/
│   │   └── constants.ts     # Endpoints, timeouts, regex, error codes
│   ├── lib/
│   │   ├── base58.ts        # Base58 32-byte public key validator
│   │   ├── cache.ts         # In-memory sliding TTL cache
│   │   ├── errors.ts        # AppError and formatted tool error responses
│   │   ├── http.ts          # Resilient fetch helper with timeout & UA
│   │   └── validation.ts    # Zod input schemas
│   ├── services/
│   │   ├── dexscreener.ts   # DexScreener pair selection service
│   │   └── rugcheck.ts      # RugCheck summary service
│   ├── tools/
│   │   ├── auditTokenComprehensive.ts
│   │   ├── checkSolanaRug.ts
│   │   ├── getSolanaMarketData.ts
│   │   ├── index.ts         # Tool registration & dispatcher
│   │   └── verdict.ts       # Safety verdict & cross-signal engine
│   ├── types/
│   │   └── index.ts         # TypeScript definitions
│   └── index.ts             # Server entrypoint (StdioServerTransport)
├── tests/
│   ├── validation.test.mjs  # Unit tests for Base58 & schema validation
│   └── verdict.test.mjs     # Unit tests for verdict classification
├── scripts/
│   └── smoke-test.mjs       # Stdio JSON-RPC smoke test
├── package.json
├── tsconfig.json
└── README.md
```

---

## License

MIT
