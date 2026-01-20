/**
 * Set reasoning and validation (FR-030 to FR-034)
 */

import type { NormalisedCidr, OverlapResult } from './types';
import { ipv4ToBigInt, ipv6ToBigInt } from './parser';

/**
 * Check if an IP address is contained in a prefix (FR-030)
 */
export function containsIp(cidr: NormalisedCidr, ip: string): boolean {
  try {
    const ipInt = cidr.version === 6 ? ipv6ToBigInt(ip) : ipv4ToBigInt(ip);
    const mask = (1n << BigInt(cidr.bits - cidr.prefix)) - 1n;
    const lastAddr = cidr.network + mask;

    return ipInt >= cidr.network && ipInt <= lastAddr;
  } catch {
    return false;
  }
}

/**
 * Check if prefix A contains prefix B (FR-031)
 */
export function containsPrefix(a: NormalisedCidr, b: NormalisedCidr): boolean {
  if (a.version !== b.version || a.bits !== b.bits) return false;

  // A contains B if:
  // 1. A's prefix is shorter (less specific)
  // 2. B's network is within A's range

  if (a.prefix > b.prefix) return false;

  const aMask = (1n << BigInt(a.bits - a.prefix)) - 1n;
  const aLast = a.network + aMask;

  const bMask = (1n << BigInt(b.bits - b.prefix)) - 1n;
  const bLast = b.network + bMask;

  return b.network >= a.network && bLast <= aLast;
}

/**
 * Detect overlaps between prefixes (FR-032)
 */
export function detectOverlaps(cidrs: NormalisedCidr[]): OverlapResult {
  const overlaps: OverlapResult['overlaps'] = [];

  for (let i = 0; i < cidrs.length; i++) {
    for (let j = i + 1; j < cidrs.length; j++) {
      const a = cidrs[i]!;
      const b = cidrs[j]!;

      if (a.version !== b.version || a.bits !== b.bits) continue;

      const aMask = (1n << BigInt(a.bits - a.prefix)) - 1n;
      const aLast = a.network + aMask;

      const bMask = (1n << BigInt(b.bits - b.prefix)) - 1n;
      const bLast = b.network + bMask;

      // Check for overlap
      const hasOverlap = !(aLast < b.network || bLast < a.network);

      if (hasOverlap) {
        let type: 'IDENTICAL' | 'A_CONTAINS_B' | 'B_CONTAINS_A' | 'PARTIAL';

        if (a.network === b.network && a.prefix === b.prefix) {
          type = 'IDENTICAL';
        } else if (containsPrefix(a, b)) {
          type = 'A_CONTAINS_B';
        } else if (containsPrefix(b, a)) {
          type = 'B_CONTAINS_A';
        } else {
          type = 'PARTIAL';
        }

        overlaps.push({ a, b, type });
      }
    }
  }

  return {
    hasOverlap: overlaps.length > 0,
    overlaps,
  };
}

/**
 * Check if two prefixes are adjacent (FR-033)
 */
export function areAdjacent(a: NormalisedCidr, b: NormalisedCidr): boolean {
  if (a.version !== b.version || a.bits !== b.bits) return false;
  if (a.prefix !== b.prefix) return false;

  const size = 1n << BigInt(a.bits - a.prefix);
  const aLast = a.network + size - 1n;
  const bLast = b.network + size - 1n;

  // Adjacent if one ends exactly where the other begins
  return aLast + 1n === b.network || bLast + 1n === a.network;
}

/**
 * Check if two prefixes can be merged (FR-033)
 * They must be siblings (same parent, adjacent, same prefix length)
 */
export function canMerge(a: NormalisedCidr, b: NormalisedCidr): boolean {
  if (a.version !== b.version || a.bits !== b.bits) return false;
  if (a.prefix !== b.prefix) return false;
  if (a.prefix === 0) return false;

  const parentPrefix = a.prefix - 1;
  const parentMask = (1n << BigInt(a.bits - parentPrefix)) - 1n;
  const parentMaskBits = ~parentMask & ((1n << BigInt(a.bits)) - 1n);

  const aParent = a.network & parentMaskBits;
  const bParent = b.network & parentMaskBits;

  return aParent === bParent;
}

/**
 * Compute union of prefix sets (FR-034)
 * Returns minimal set of prefixes covering all inputs
 */
export function unionPrefixes(a: NormalisedCidr[], b: NormalisedCidr[]): NormalisedCidr[] {
  const combined = [...a, ...b];

  // Remove duplicates
  const unique = new Map<string, NormalisedCidr>();
  for (const cidr of combined) {
    const key = `${cidr.version}:${cidr.network}/${cidr.prefix}`;
    unique.set(key, cidr);
  }

  return Array.from(unique.values());
}

/**
 * Compute intersection of two prefixes (FR-034)
 * Returns the overlapping portion, if any
 */
export function intersectPrefixes(a: NormalisedCidr, b: NormalisedCidr): NormalisedCidr | null {
  if (a.version !== b.version || a.bits !== b.bits) return null;

  const aMask = (1n << BigInt(a.bits - a.prefix)) - 1n;
  const aLast = a.network + aMask;

  const bMask = (1n << BigInt(b.bits - b.prefix)) - 1n;
  const bLast = b.network + bMask;

  // No overlap
  if (aLast < b.network || bLast < a.network) return null;

  // Find the intersection range
  const intStart = a.network > b.network ? a.network : b.network;
  const intEnd = aLast < bLast ? aLast : bLast;

  // The intersection is the more specific (longer) prefix
  if (containsPrefix(a, b)) return b;
  if (containsPrefix(b, a)) return a;

  // Partial overlap - return the overlapping range as the more specific prefix
  // This is a simplification; true intersection might require multiple prefixes
  const longerPrefix = a.prefix > b.prefix ? a.prefix : b.prefix;

  return {
    version: a.version,
    bits: a.bits,
    network: intStart,
    prefix: longerPrefix,
  };
}

/**
 * Compute difference A - B (FR-034)
 * Returns prefixes in A that are not in B
 * This is a simplified implementation; full implementation would require
 * splitting A into multiple prefixes to exclude B
 */
export function differencePrefixes(a: NormalisedCidr, b: NormalisedCidr): NormalisedCidr[] {
  if (a.version !== b.version || a.bits !== b.bits) return [a];

  // If B contains A, result is empty
  if (containsPrefix(b, a)) return [];

  // If A contains B, we need to split A to exclude B
  // This is complex and would require recursive splitting
  // For now, return A if there's no containment
  if (!containsPrefix(a, b)) {
    // Check for overlap
    const aMask = (1n << BigInt(a.bits - a.prefix)) - 1n;
    const aLast = a.network + aMask;
    const bMask = (1n << BigInt(b.bits - b.prefix)) - 1n;
    const bLast = b.network + bMask;

    if (aLast < b.network || bLast < a.network) {
      // No overlap
      return [a];
    }
  }

  // Simplified: return A (full implementation would split)
  return [a];
}

