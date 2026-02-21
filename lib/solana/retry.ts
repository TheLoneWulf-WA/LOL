/**
 * Retries an async function with exponential backoff.
 * Useful for transient network errors on Solana RPC calls.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        break;
      }

      const backoff = delayMs * Math.pow(2, attempt);
      console.warn(
        `Retry attempt ${attempt + 1}/${maxRetries} after ${backoff}ms:`,
        error instanceof Error ? error.message : error,
      );

      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  throw lastError;
}
