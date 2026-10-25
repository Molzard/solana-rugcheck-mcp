import test from "node:test";
import assert from "node:assert/strict";
import { isValidSolanaAddress, sanitizeMintAddress } from "../dist/lib/base58.js";
import { validateMintAddress } from "../dist/lib/validation.js";
import { ValidationError, NotFoundError, RateLimitError } from "../dist/lib/errors.js";

test("Base58 Validation - Valid Addresses", () => {
  const usdc = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const wsol = "So11111111111111111111111111111111111111112";
  const bonk = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

  assert.equal(isValidSolanaAddress(usdc), true);
  assert.equal(isValidSolanaAddress(wsol), true);
  assert.equal(isValidSolanaAddress(bonk), true);
  assert.equal(sanitizeMintAddress(`  ${usdc}  `), usdc);
});

test("Base58 Validation - Invalid Addresses", () => {
  assert.equal(isValidSolanaAddress(""), false);
  assert.equal(isValidSolanaAddress("12345"), false);
  assert.equal(isValidSolanaAddress(null), false);
  assert.equal(isValidSolanaAddress(undefined), false);
  assert.equal(isValidSolanaAddress(12345), false);

  // Invalid base58 characters (0, O, I, l)
  assert.equal(isValidSolanaAddress("0PjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), false);
  assert.equal(isValidSolanaAddress("OPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), false);
  assert.equal(isValidSolanaAddress("IPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), false);
  assert.equal(isValidSolanaAddress("lPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), false);

  // Incorrect length
  assert.equal(isValidSolanaAddress("2b1kV6DkPAnmd5cvxPqyffuzQZ9zFn4Ni"), false);
});

test("Validation Helper - schema parsing", () => {
  const usdc = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

  // Object input
  assert.equal(validateMintAddress({ mintAddress: usdc }), usdc);
  assert.equal(validateMintAddress({ mintAddress: `  ${usdc} ` }), usdc);

  // String input
  assert.equal(validateMintAddress(usdc), usdc);

  // Rejections
  assert.throws(
    () => validateMintAddress({ mintAddress: "invalid-address" }),
    (err) => err instanceof ValidationError && err.code === "INVALID_ADDRESS"
  );

  assert.throws(
    () => validateMintAddress({}),
    (err) => err instanceof ValidationError && err.code === "INVALID_ADDRESS"
  );
});

test("Error Formatting - NotFoundError and RateLimitError", () => {
  const notFound = new NotFoundError("Pair not found", { mint: "test" });
  assert.equal(notFound.code, "NOT_FOUND");
  assert.equal(notFound.statusCode, 404);
  assert.equal(notFound.toResponse().isError, true);

  const rateLimit = new RateLimitError("Too many requests", 30);
  assert.equal(rateLimit.code, "RATE_LIMITED");
  assert.equal(rateLimit.retryAfterSeconds, 30);
  assert.equal(rateLimit.toResponse().retryAfterSeconds, 30);
});
