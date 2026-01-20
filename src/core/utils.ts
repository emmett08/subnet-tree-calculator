/**
 * Shared utility functions for core domain logic
 */

/**
 * Assert that a number is an integer within a specified range
 * @throws Error if validation fails
 */
export function assertIntegerInRange(n: number, min: number, max: number, msg: string): void {
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(msg);
}

