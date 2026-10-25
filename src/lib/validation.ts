import { z } from "zod";
import { isValidSolanaAddress, sanitizeMintAddress } from "./base58.js";
import { ValidationError } from "./errors.js";

export const MintAddressSchema = z
  .string({
    required_error: "mintAddress is required",
    invalid_type_error: "mintAddress must be a string"
  })
  .trim()
  .min(32, { message: "mintAddress must be at least 32 characters" })
  .max(44, { message: "mintAddress must be at most 44 characters" })
  .refine((val) => isValidSolanaAddress(val), {
    message: "Invalid Solana mint address: must be valid base58 string decoding to exactly 32 bytes"
  });

export const ToolInputSchema = z.object({
  mintAddress: MintAddressSchema
});

export type ToolInput = z.infer<typeof ToolInputSchema>;

export function validateMintAddress(input: unknown): string {
  if (typeof input === "object" && input !== null && "mintAddress" in input) {
    const raw = (input as { mintAddress: unknown }).mintAddress;
    if (typeof raw !== "string" || !isValidSolanaAddress(raw)) {
      throw new ValidationError(
        "INVALID_ADDRESS: mintAddress must be a valid 32-byte Base58 Solana address",
        { received: raw }
      );
    }
    return sanitizeMintAddress(raw);
  }

  if (typeof input === "string") {
    if (!isValidSolanaAddress(input)) {
      throw new ValidationError(
        "INVALID_ADDRESS: mintAddress must be a valid 32-byte Base58 Solana address",
        { received: input }
      );
    }
    return sanitizeMintAddress(input);
  }

  throw new ValidationError("INVALID_ADDRESS: mintAddress parameter is required", { received: input });
}
