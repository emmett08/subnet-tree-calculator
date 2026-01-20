/**
 * String utility functions for UI components
 * Extracted from SubnetTreeCalculator for better testability and reusability
 */

/**
 * Truncate a string in the middle with ellipsis
 * @param s - String to truncate
 * @param maxChars - Maximum number of characters (including ellipsis)
 * @returns Truncated string with ellipsis in the middle
 * 
 * @example
 * truncateMiddle("192.168.100.200", 10) // "192.1…0.200"
 * truncateMiddle("2001:db8:abcd:ef01::", 15) // "2001:d…ef01::"
 */
export function truncateMiddle(s: string, maxChars: number): string {
  if (s.length <= maxChars) return s;
  if (maxChars <= 3) return s.slice(0, maxChars);
  const keep = maxChars - 1;
  const left = Math.ceil(keep / 2);
  const right = Math.floor(keep / 2);
  return `${s.slice(0, left)}…${s.slice(s.length - right)}`;
}

/**
 * Truncate a string at the start with ellipsis
 * @param s - String to truncate
 * @param maxChars - Maximum number of characters (including ellipsis)
 * @returns Truncated string with ellipsis at the start
 * 
 * @example
 * truncateStart("192.168.100.200", 10) // "…8.100.200"
 */
export function truncateStart(s: string, maxChars: number): string {
  if (s.length <= maxChars) return s;
  if (maxChars <= 1) return "…";
  return `…${s.slice(s.length - (maxChars - 1))}`;
}

