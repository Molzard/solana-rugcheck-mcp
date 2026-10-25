import bs58 from "bs58";
import { BASE58_REGEX } from "../config/constants.js";

/**
 * Validates whether an input string is a valid Solana base58 public key (32 bytes).
 */
export function isValidSolanaAddress(address: unknown): address is string {
  if (typeof address !== "string") {
    return false;
  }

  const trimmed = address.trim();
  if (!BASE58_REGEX.test(trimmed)) {
    return false;
  }

  try {
    const decoded = bs58.decode(trimmed);
    return decoded.length === 32;
  } catch {
    return false;
  }
}

/**
 * Asserts address validity or returns formatted string
 */
export function sanitizeMintAddress(address: string): string {
  return address.trim();
}
