/**
 * Input parsing and normalisation (FR-001 to FR-005)
 */

import type { IpVersion, NormalisedCidr, Result } from './types';
import { AddressClass } from './types';
import { assertIntegerInRange } from './utils';

function isLikelyIpv6(s: string): boolean {
  return s.includes(':');
}

function stripZoneIndex(ip: string): string {
  const i = ip.indexOf('%');
  return i === -1 ? ip : ip.slice(0, i);
}

export function ipv4ToBigInt(ip: string): bigint {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) throw new Error('Invalid IPv4 address (expected a.b.c.d)');

  let n = 0n;
  for (const p of parts) {
    if (!/^\d+$/.test(p)) throw new Error('Invalid IPv4 address (octets must be 0-255)');
    const v = Number(p);
    if (v < 0 || v > 255) throw new Error('Invalid IPv4 address (octets must be 0-255)');
    n = n * 256n + BigInt(v);
  }
  return n;
}

export function bigIntToIpv4(n: bigint): string {
  if (n < 0n || n > 0xffffffffn) throw new Error('IPv4 value out of range');
  // Convert to number first to avoid BigInt mixing issues in some environments
  const num = Number(n);
  const a = (num >>> 24) & 0xff;
  const b = (num >>> 16) & 0xff;
  const c = (num >>> 8) & 0xff;
  const d = num & 0xff;
  return `${a}.${b}.${c}.${d}`;
}

function expandEmbeddedIpv4(ipv6: string): string {
  if (!ipv6.includes('.')) return ipv6;

  const lastColon = ipv6.lastIndexOf(':');
  if (lastColon === -1) throw new Error('Invalid IPv6 address');

  const head = ipv6.slice(0, lastColon);
  const tail = ipv6.slice(lastColon + 1);

  const v4 = ipv4ToBigInt(tail);
  const hi = Number((v4 >> 16n) & 0xffffn);
  const lo = Number(v4 & 0xffffn);

  const hiStr = hi.toString(16);
  const loStr = lo.toString(16);

  const sep = head.endsWith(':') ? '' : ':';
  return `${head}${sep}${hiStr}:${loStr}`;
}

export function ipv6ToBigInt(ip: string): bigint {
  let s = stripZoneIndex(ip.trim()).toLowerCase();
  if (s.length === 0) throw new Error('Invalid IPv6 address');

  s = expandEmbeddedIpv4(s);

  const parts = s.split('::');
  if (parts.length > 2) throw new Error("Invalid IPv6 address (too many '::')");

  const leftPart = parts[0] ?? '';
  const rightPart = parts.length === 2 ? (parts[1] ?? '') : '';

  const left = leftPart.length ? leftPart.split(':') : [];
  const right = rightPart.length ? rightPart.split(':') : [];

  if (parts.length === 1) {
    const hextets = left;
    if (hextets.length !== 8) throw new Error('Invalid IPv6 address (expected 8 hextets)');
    return hextetsToBigInt(hextets);
  }

  const total = left.length + right.length;
  if (total > 8) throw new Error('Invalid IPv6 address (too many hextets)');

  const missing = 8 - total;
  const full: string[] = [...left, ...Array(missing).fill('0'), ...right];
  if (full.length !== 8) throw new Error('Invalid IPv6 address');

  return hextetsToBigInt(full);
}

function hextetsToBigInt(hextets: string[]): bigint {
  let n = 0n;
  for (const h of hextets) {
    if (h.length === 0) throw new Error('Invalid IPv6 address');
    if (!/^[0-9a-f]{1,4}$/i.test(h)) throw new Error('Invalid IPv6 address (bad hextet)');
    const v = parseInt(h, 16);
    if (v < 0 || v > 0xffff) throw new Error('Invalid IPv6 address (hextet out of range)');
    n = (n << 16n) + BigInt(v);
  }
  return n;
}

export function bigIntToIpv6(n: bigint): string {
  if (n < 0n || n > ((1n << 128n) - 1n)) throw new Error('IPv6 value out of range');

  const hextets: number[] = new Array(8);
  let x = n;
  for (let i = 7; i >= 0; i--) {
    hextets[i] = Number(x & 0xffffn);
    x >>= 16n;
  }

  let bestStart = -1;
  let bestLen = 0;

  for (let i = 0; i < 8; ) {
    if (hextets[i] === 0) {
      let j = i;
      while (j < 8 && hextets[j] === 0) j++;
      const len = j - i;
      if (len >= 2 && len > bestLen) {
        bestStart = i;
        bestLen = len;
      }
      i = j;
    } else {
      i++;
    }
  }

  const toHex = (v: number) => v.toString(16);

  if (bestStart === -1) {
    return hextets.map(toHex).join(':');
  }

  const before = hextets.slice(0, bestStart).map(toHex);
  const after = hextets.slice(bestStart + bestLen).map(toHex);

  if (before.length === 0 && after.length === 0) return '::';

  const left = before.join(':');
  const right = after.join(':');

  if (left.length === 0) return `::${right}`;
  if (right.length === 0) return `${left}::`;
  return `${left}::${right}`;
}

export function maskFromPrefix(prefix: number, bits: 32 | 128): bigint {
  assertIntegerInRange(prefix, 0, bits, `Invalid prefix (expected 0..${bits})`);

  if (prefix === 0) return 0n;
  if (prefix === bits) return (1n << BigInt(bits)) - 1n;

  const ones = (1n << BigInt(prefix)) - 1n;
  const shift = BigInt(bits - prefix);
  return ones << shift;
}

export function wildcardFromPrefix(prefix: number, bits: 32 | 128): bigint {
  assertIntegerInRange(prefix, 0, bits, `Invalid prefix (expected 0..${bits})`);
  const hostBits = bits - prefix;
  if (hostBits === 0) return 0n;
  return (1n << BigInt(hostBits)) - 1n;
}

/**
 * Parse CIDR notation (FR-001, FR-002, FR-004)
 */
export function parseCidr(input: string): NormalisedCidr {
  const trimmed = input.trim();
  const parts = trimmed.split('/');
  if (parts.length !== 2) throw new Error('Invalid CIDR (expected address/prefix)');

  const addrStr = parts[0]?.trim();
  const prefixStr = parts[1]?.trim();
  if (!addrStr || !prefixStr) throw new Error('Invalid CIDR (expected address/prefix)');
  if (!/^\d+$/.test(prefixStr)) throw new Error('Invalid CIDR prefix');

  const prefix = Number(prefixStr);
  const version: IpVersion = isLikelyIpv6(addrStr) ? 6 : 4;
  const bits: 32 | 128 = version === 6 ? 128 : 32;
  assertIntegerInRange(prefix, 0, bits, `Invalid CIDR prefix (expected 0..${bits})`);

  const ip = version === 6 ? ipv6ToBigInt(addrStr) : ipv4ToBigInt(addrStr);
  const mask = maskFromPrefix(prefix, bits);
  const network = ip & mask;

  return { version, bits, network, prefix };
}

/**
 * Parse netmask notation and convert to prefix (FR-001)
 */
export function parseCidrWithNetmask(address: string, netmask: string): NormalisedCidr {
  const version: IpVersion = isLikelyIpv6(address) ? 6 : 4;
  const bits: 32 | 128 = version === 6 ? 128 : 32;

  const ip = version === 6 ? ipv6ToBigInt(address) : ipv4ToBigInt(address);
  const maskValue = version === 6 ? ipv6ToBigInt(netmask) : ipv4ToBigInt(netmask);

  // Convert mask to prefix length by counting leading ones
  let prefix = 0;
  let temp = maskValue;
  const maxBit = 1n << BigInt(bits - 1);

  // Count leading ones
  for (let i = 0; i < bits; i++) {
    if ((temp & (maxBit >> BigInt(i))) !== 0n) {
      prefix++;
    } else {
      break;
    }
  }

  // Verify remaining bits are all zeros (contiguous mask)
  const expectedMask = maskFromPrefix(prefix, bits);
  if (maskValue !== expectedMask) {
    throw new Error('Invalid netmask (must be contiguous ones)');
  }

  const network = ip & maskValue;

  return { version, bits, network, prefix };
}

/**
 * Convert IP range to minimal covering prefixes (FR-003)
 */
export function rangeToMinimalPrefixes(start: string, end: string): NormalisedCidr[] {
  const version: IpVersion = isLikelyIpv6(start) ? 6 : 4;
  const bits: 32 | 128 = version === 6 ? 128 : 32;

  const startInt = version === 6 ? ipv6ToBigInt(start) : ipv4ToBigInt(start);
  const endInt = version === 6 ? ipv6ToBigInt(end) : ipv4ToBigInt(end);

  if (startInt > endInt) {
    throw new Error('Invalid range: start must be <= end');
  }

  const result: NormalisedCidr[] = [];
  let current = startInt;

  while (current <= endInt) {
    // Find the largest prefix that starts at current and doesn't exceed endInt
    let prefix: number = bits;

    // Find the number of trailing zeros in current (determines alignment)
    let trailingZeros = 0;
    let temp = current;
    while (trailingZeros < bits && (temp & 1n) === 0n) {
      trailingZeros++;
      temp >>= 1n;
    }

    // Try progressively smaller prefixes
    for (let p = bits - trailingZeros; p <= bits; p++) {
      const blockSize = 1n << BigInt(bits - p);
      const blockEnd = current + blockSize - 1n;

      if (blockEnd <= endInt) {
        prefix = p;
        break;
      }
    }

    result.push({ version, bits, network: current, prefix: prefix as typeof bits });
    const blockSize = 1n << BigInt(bits - prefix);
    current += blockSize;

    if (current === 0n) break; // Overflow protection
  }

  return result;
}

export function formatAddress(version: IpVersion, n: bigint): string {
  return version === 6 ? bigIntToIpv6(n) : bigIntToIpv4(n);
}

export function formatCidr(version: IpVersion, network: bigint, prefix: number): string {
  return `${formatAddress(version, network)}/${prefix}`;
}

/**
 * Classify special address ranges (FR-006)
 */
export function classifyAddress(address: string): AddressClass[] {
  const classes: AddressClass[] = [];

  try {
    if (isLikelyIpv6(address)) {
      const ip = ipv6ToBigInt(address);

      // Unspecified ::/128
      if (ip === 0n) {
        classes.push(AddressClass.UNSPECIFIED);
      }
      // Loopback ::1/128
      else if (ip === 1n) {
        classes.push(AddressClass.LOOPBACK);
      }
      // Multicast ff00::/8 (check before unique local)
      else if ((ip >> 120n) === 0xffn) {
        classes.push(AddressClass.MULTICAST);
      }
      // Link-local fe80::/10
      else if ((ip >> 118n) === 0x3fan) {
        classes.push(AddressClass.LINK_LOCAL);
      }
      // Unique local fc00::/7
      else if ((ip >> 121n) === 0x7en || (ip >> 121n) === 0x7fn) {
        classes.push(AddressClass.UNIQUE_LOCAL);
        classes.push(AddressClass.PRIVATE);
      }
      // Documentation 2001:db8::/32
      else if ((ip >> 96n) === 0x20010db8n) {
        classes.push(AddressClass.DOCUMENTATION);
      }
      // Global unicast (2000::/3)
      else if ((ip >> 125n) === 0x1n) {
        classes.push(AddressClass.GLOBAL_UNICAST);
        classes.push(AddressClass.PUBLIC);
      }
      // Reserved
      else {
        classes.push(AddressClass.RESERVED);
      }
    } else {
      const ip = ipv4ToBigInt(address);

      // Unspecified 0.0.0.0
      if (ip === 0n) {
        classes.push(AddressClass.UNSPECIFIED);
      }
      // Loopback 127.0.0.0/8
      else if ((ip >> 24n) === 127n) {
        classes.push(AddressClass.LOOPBACK);
      }
      // Multicast 224.0.0.0/4 (check before private ranges)
      else if ((ip >> 28n) === 0xen) {
        classes.push(AddressClass.MULTICAST);
      }
      // Reserved (240.0.0.0/4 except broadcast, check before private)
      else if ((ip >> 28n) === 0xfn && ip !== 0xffffffffn) {
        classes.push(AddressClass.RESERVED);
      }
      // Broadcast 255.255.255.255
      else if (ip === 0xffffffffn) {
        classes.push(AddressClass.BROADCAST);
      }
      // Private 10.0.0.0/8
      else if ((ip >> 24n) === 10n) {
        classes.push(AddressClass.PRIVATE);
      }
      // Private 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
      else if ((ip >> 20n) === 0xac1n) {
        classes.push(AddressClass.PRIVATE);
      }
      // Private 192.168.0.0/16
      else if ((ip >> 16n) === 0xc0a8n) {
        classes.push(AddressClass.PRIVATE);
      }
      // Link-local 169.254.0.0/16
      else if ((ip >> 16n) === 0xa9fen) {
        classes.push(AddressClass.LINK_LOCAL);
      }
      // Documentation 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24
      else if (
        (ip >> 8n) === 0xc00002n ||
        (ip >> 8n) === 0xc63364n ||
        (ip >> 8n) === 0xcb0071n
      ) {
        classes.push(AddressClass.DOCUMENTATION);
      }
      // Public
      else {
        classes.push(AddressClass.PUBLIC);
      }
    }
  } catch {
    // Invalid address
  }

  return classes;
}

/**
 * Safe parsing with Result type
 */
export function parseCidrSafe(input: string): Result<NormalisedCidr> {
  try {
    return { ok: true, value: parseCidr(input) };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
}

