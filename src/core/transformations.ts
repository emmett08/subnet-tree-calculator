/**
 * Subnet transformations (FR-020 to FR-025)
 */

import type { IpVersion, NormalisedCidr } from './types';
import { maskFromPrefix } from './parser';

/**
 * Binary split of a prefix (FR-020)
 * Returns [left child, right child] where left has bit 0 appended, right has bit 1
 */
export function splitBinary(cidr: NormalisedCidr): [NormalisedCidr, NormalisedCidr] {
  if (cidr.prefix >= cidr.bits) {
    throw new Error(`Cannot split /${cidr.prefix} - already at maximum prefix length`);
  }

  const childPrefix = cidr.prefix + 1;
  const childSize = 1n << BigInt(cidr.bits - childPrefix);

  const left: NormalisedCidr = {
    version: cidr.version,
    bits: cidr.bits,
    network: cidr.network,
    prefix: childPrefix,
  };

  const right: NormalisedCidr = {
    version: cidr.version,
    bits: cidr.bits,
    network: cidr.network + childSize,
    prefix: childPrefix,
  };

  return [left, right];
}

/**
 * Split into N equal subnets (FR-021)
 * N must be a power of 2
 */
export function splitIntoN(cidr: NormalisedCidr, n: number): NormalisedCidr[] {
  if (n <= 0 || !Number.isInteger(n)) {
    throw new Error('N must be a positive integer');
  }

  // Check if n is a power of 2
  if ((n & (n - 1)) !== 0) {
    throw new Error('N must be a power of 2');
  }

  const bitsNeeded = Math.log2(n);
  const newPrefix = cidr.prefix + bitsNeeded;

  if (newPrefix > cidr.bits) {
    throw new Error(`Cannot split into ${n} subnets - would exceed maximum prefix length`);
  }

  const result: NormalisedCidr[] = [];
  const subnetSize = 1n << BigInt(cidr.bits - newPrefix);

  for (let i = 0; i < n; i++) {
    result.push({
      version: cidr.version,
      bits: cidr.bits,
      network: cidr.network + BigInt(i) * subnetSize,
      prefix: newPrefix,
    });
  }

  return result;
}

/**
 * Split by required host count (FR-022)
 * Returns the smallest subnet that can accommodate the required number of hosts
 */
export function splitByHostCount(
  cidr: NormalisedCidr,
  requiredHosts: number
): { prefix: number; subnets: NormalisedCidr[] } {
  if (requiredHosts <= 0) {
    throw new Error('Required hosts must be positive');
  }

  const version = cidr.version;
  let hostBits: number;

  if (version === 4) {
    // IPv4: need to account for network and broadcast addresses
    // For /31 and /32, special handling
    if (requiredHosts === 1) {
      hostBits = 0; // /32
    } else if (requiredHosts === 2) {
      hostBits = 1; // /31 (RFC 3021)
    } else {
      // Need requiredHosts + 2 (network + broadcast)
      hostBits = Math.ceil(Math.log2(requiredHosts + 2));
    }
  } else {
    // IPv6: all addresses usable
    hostBits = Math.ceil(Math.log2(requiredHosts));
  }

  const newPrefix = cidr.bits - hostBits;

  if (newPrefix < cidr.prefix) {
    throw new Error(`Cannot accommodate ${requiredHosts} hosts in /${cidr.prefix}`);
  }

  const numSubnets = 1 << (newPrefix - cidr.prefix);
  const subnets = splitIntoN(cidr, numSubnets);

  return { prefix: newPrefix, subnets };
}

/**
 * Merge sibling prefixes (FR-023)
 * Returns the parent prefix if the two CIDRs are valid siblings
 */
export function mergeSiblings(a: NormalisedCidr, b: NormalisedCidr): NormalisedCidr {
  if (a.version !== b.version || a.bits !== b.bits) {
    throw new Error('Cannot merge CIDRs of different versions');
  }

  if (a.prefix !== b.prefix) {
    throw new Error('Cannot merge CIDRs with different prefix lengths');
  }

  if (a.prefix === 0) {
    throw new Error('Cannot merge /0 prefixes');
  }

  const parentPrefix = a.prefix - 1;
  const parentMask = maskFromPrefix(parentPrefix, a.bits);

  const aParent = a.network & parentMask;
  const bParent = b.network & parentMask;

  if (aParent !== bParent) {
    throw new Error('CIDRs are not siblings (different parents)');
  }

  // Check that they are actually the two children
  const [left, right] = splitBinary({ version: a.version, bits: a.bits, network: aParent, prefix: parentPrefix });

  const isValid =
    (a.network === left.network && b.network === right.network) ||
    (a.network === right.network && b.network === left.network);

  if (!isValid) {
    throw new Error('CIDRs are not valid siblings');
  }

  return {
    version: a.version,
    bits: a.bits,
    network: aParent,
    prefix: parentPrefix,
  };
}

/**
 * Summarize a set of prefixes (FR-024)
 * Returns a minimal set of aggregated prefixes that cover all inputs
 */
export function summarizePrefixes(cidrs: NormalisedCidr[]): NormalisedCidr[] {
  if (cidrs.length === 0) return [];
  if (cidrs.length === 1) return [...cidrs];

  // Ensure all same version
  const version = cidrs[0]!.version;
  const bits = cidrs[0]!.bits;
  if (!cidrs.every((c) => c.version === version && c.bits === bits)) {
    throw new Error('All CIDRs must be the same IP version');
  }

  // Sort by network address
  const sorted = [...cidrs].sort((a, b) => (a.network < b.network ? -1 : a.network > b.network ? 1 : 0));

  // Iteratively merge adjacent siblings
  let current = sorted;
  let changed = true;

  while (changed) {
    changed = false;
    const next: NormalisedCidr[] = [];
    let i = 0;

    while (i < current.length) {
      const a = current[i]!;

      if (i + 1 < current.length) {
        const b = current[i + 1]!;

        // Try to merge
        try {
          const merged = mergeSiblings(a, b);
          next.push(merged);
          i += 2;
          changed = true;
          continue;
        } catch {
          // Not siblings, keep a
        }
      }

      next.push(a);
      i++;
    }

    current = next;
  }

  return current;
}

/**
 * Compute minimal covering supernet (FR-025)
 * Returns the smallest single prefix that contains all input prefixes
 */
export function minimalCoveringSupernet(cidrs: NormalisedCidr[]): NormalisedCidr {
  if (cidrs.length === 0) {
    throw new Error('Cannot compute supernet of empty set');
  }

  // Single prefix - return as-is
  if (cidrs.length === 1) {
    return cidrs[0]!;
  }

  const version = cidrs[0]!.version;
  const bits = cidrs[0]!.bits;
  if (!cidrs.every((c) => c.version === version && c.bits === bits)) {
    throw new Error('All CIDRs must be the same IP version');
  }

  // Find min and max network addresses
  let minNet = cidrs[0]!.network;
  let maxNet = cidrs[0]!.network;

  for (const cidr of cidrs) {
    if (cidr.network < minNet) minNet = cidr.network;

    const lastAddr = cidr.network + (1n << BigInt(bits - cidr.prefix)) - 1n;
    if (lastAddr > maxNet) maxNet = lastAddr;
  }

  // Find the common prefix length (start from most specific)
  let prefix: number = bits;
  for (let p = 0; p <= bits; p++) {
    const mask = maskFromPrefix(p, bits);
    if ((minNet & mask) === (maxNet & mask)) {
      prefix = p;
      break;
    }
  }

  const mask = maskFromPrefix(prefix, bits);
  const network = minNet & mask;

  return { version, bits, network, prefix: prefix as typeof bits };
}


