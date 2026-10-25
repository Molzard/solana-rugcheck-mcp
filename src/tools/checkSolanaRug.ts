import { rugCheckService } from "../services/rugcheck.js";
import { validateMintAddress } from "../lib/validation.js";
import { evaluateRugReport } from "./verdict.js";
import { formatErrorResponse } from "../lib/errors.js";

export async function handleCheckSolanaRug(args: unknown) {
  try {
    const mint = validateMintAddress(args);
    const summary = await rugCheckService.getSummary(mint);
    const result = evaluateRugReport(mint, summary);

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
