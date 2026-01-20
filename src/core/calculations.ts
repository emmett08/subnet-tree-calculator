/**
 * Core subnet calculations (FR-010 to FR-013)
 */

import type { IpVersion, SubnetMeta } from './types';
import { formatAddress, formatCidr, maskFromPrefix, wildcardFromPrefix } from './parser';
import { assertIntegerInRange } from './utils';

const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * Compute comprehensive subnet metadata (FR-010, FR-011)
 */
export function subnetMeta(
  network: bigint,
  prefix: number,
  version: IpVersion,
  bits: 32 | 128
): SubnetMeta {
  assertIntegerInRange(prefix, 0, bits, `Invalid prefix (expected 0..${bits})`);

  const mask = maskFromPrefix(prefix, bits);
  const wildcard = wildcardFromPrefix(prefix, bits);
  const last = network | wildcard;

  const addressCount = 1n << BigInt(bits - prefix);

  let usableCount: bigint;
  let firstUsable: bigint | null;
  let lastUsable: bigint | null;

  if (version === 4) {
    if (prefix === 32) {
      usableCount = 1n;
      firstUsable = network;
      lastUsable = network;
    } else if (prefix === 31) {
      // RFC 3021 point-to-point: both addresses usable
      usableCount = 2n;
      firstUsable = network;
      lastUsable = last;
    } else {
      usableCount = addressCount - 2n;
      firstUsable = network + 1n;
      lastUsable = last - 1n;
    }
  } else {
    // IPv6: treat all addresses as usable.
    usableCount = addressCount;
    firstUsable = network;
    lastUsable = last;
  }

  return {
    version,
    bits,
    cidr: formatCidr(version, network, prefix),
    network: formatAddress(version, network),
    prefix,
    netmask: formatAddress(version, mask),
    wildcard: formatAddress(version, wildcard),
    broadcast: version === 4 ? formatAddress(version, last) : undefined,
    lastAddress: formatAddress(version, last),
    addressCount,
    usableCount,
    firstUsable: firstUsable == null ? null : formatAddress(version, firstUsable),
    lastUsable: lastUsable == null ? null : formatAddress(version, lastUsable),
  };
}

/**
 * Format count with locale or exponential notation for large numbers
 */
export function formatCount(count: bigint, bits?: number, prefix?: number): string {
  if (count <= MAX_SAFE_BIGINT) return Number(count).toLocaleString('en-GB');

  if (bits != null && prefix != null) {
    const exp = bits - prefix;
    const digits = count.toString().length;
    return `2^${exp} (${digits} digits)`;
  }

  return `${count.toString()} (bigint)`;
}

/**
 * Binary representation with prefix boundary marker (FR-013)
 */
export function binaryWithPrefix(
  value: bigint,
  prefix: number,
  bits: 32 | 128,
  groupBits: number = bits === 128 ? 16 : 8,
  groupsPerLine: number = bits === 128 ? 4 : 4
): string {
  assertIntegerInRange(prefix, 0, bits, `Invalid prefix (expected 0..${bits})`);
  assertIntegerInRange(groupBits, 1, 64, 'Invalid groupBits');

  const raw = value.toString(2).padStart(bits, '0');

  let out = '';
  let bitCount = 0;
  let groupCount = 0;

  for (let i = 0; i < bits; i++) {
    if (i === prefix) out += '|';

    out += raw[i];
    bitCount++;

    if (bitCount !== bits && bitCount % groupBits === 0) {
      out += ' ';
      groupCount++;

      if (groupsPerLine > 0 && groupCount % groupsPerLine === 0) {
        out += '\n';
      }
    }
  }

  if (prefix === bits) out += '|';

  return out.trimEnd();
}

/**
 * Compute reverse DNS zone boundaries (FR-012)
 */
export function reverseDnsZone(network: bigint, prefix: number, version: IpVersion, bits: 32 | 128): string {
  if (version === 4) {
    // IPv4 reverse DNS: in-addr.arpa
    // Only /8, /16, /24 boundaries are standard
    if (prefix % 8 !== 0) {
      return `Non-standard boundary (/${prefix}) - classless delegation required`;
    }
    
    const octets: number[] = [];
    let temp = network;
    for (let i = 0; i < 4; i++) {
      octets.unshift(Number(temp & 0xffn));
      temp >>= 8n;
    }
    
    const numOctets = prefix / 8;
    const relevantOctets = octets.slice(0, numOctets).reverse();
    
    return `${relevantOctets.join('.')}.in-addr.arpa`;
  } else {
    // IPv6 reverse DNS: ip6.arpa
    // Nibble boundaries (multiples of 4)
    if (prefix % 4 !== 0) {
      return `Non-standard boundary (/${prefix}) - not on nibble boundary`;
    }

    const hex = network.toString(16).padStart(32, '0');
    const numNibbles = prefix / 4;
    // Take nibbles from the left (most significant), then reverse for DNS
    const nibbles = hex.slice(0, numNibbles).split('').reverse();

    return `${nibbles.join('.')}.ip6.arpa`;
  }
}

