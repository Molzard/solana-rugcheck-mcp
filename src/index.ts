#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { TOOLS, dispatchToolCall } from "./tools/index.js";

async function main() {
  const server = new Server(
    {
      name: "solana-rugcheck-mcp",
      version: "1.0.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOLS
    };
  });

  // Register tool execution handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return await dispatchToolCall(name, args);
  });

  // Graceful shutdown handling
  let isClosing = false;
  const shutdown = async (signal: string) => {
    if (isClosing) return;
    isClosing = true;
    console.error(`Received ${signal}, shutting down solana-rugcheck-mcp gracefully...`);
    try {
      await server.close();
    } catch (err) {
      console.error("Error during server close:", err);
    }
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection in solana-rugcheck-mcp:", reason);
  });

  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception in solana-rugcheck-mcp:", error);
    process.exit(1);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("solana-rugcheck-mcp server running on stdio transport");
}

main().catch((error) => {
  console.error("Fatal startup error in solana-rugcheck-mcp:", error);
  process.exit(1);
});
