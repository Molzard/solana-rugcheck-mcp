import { dexScreenerService } from "../services/dexscreener.js";
import { validateMintAddress } from "../lib/validation.js";
import { formatErrorResponse } from "../lib/errors.js";

export async function handleGetSolanaMarketData(args: unknown) {
  try {
    const mint = validateMintAddress(args);
    const result = await dexScreenerService.getMarketData(mint);

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
