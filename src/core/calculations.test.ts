/**
 * Tests for calculations.ts (FR-010 to FR-013)
 * Covers subnet metadata, edge cases (/31, /32, /127, /128), binary representation, reverse DNS
 */

import { describe, it, expect } from 'vitest';
import { subnetMeta, formatCount, binaryWithPrefix, reverseDnsZone } from './calculations';
import { parseCidr } from './parser';

describe('Subnet metadata (FR-010, FR-011)', () => {
  it('should compute IPv4 /24 metadata', () => {
    const cidr = parseCidr('192.168.1.0/24');
    const meta = subnetMeta(cidr.network, cidr.prefix, cidr.version, cidr.bits);

    expect(meta.network).toBe('192.168.1.0');
    expect(meta.prefix).toBe(24);
    expect(meta.broadcast).toBe('192.168.1.255');
    expect(meta.addressCount).toBe(256n);
    expect(meta.usableCount).toBe(254n);
    expect(meta.firstUsable).toBe('192.168.1.1');
    expect(meta.lastUsable).toBe('192.168.1.254');
  });

  it('should handle IPv4 /32 edge case (FR-090, FR-092)', () => {
    const cidr = parseCidr('192.168.1.1/32');
    const meta = subnetMeta(cidr.network, cidr.prefix, cidr.version, cidr.bits);

    expect(meta.addressCount).toBe(1n);
    expect(meta.usableCount).toBe(1n);
    expect(meta.firstUsable).toBe('192.168.1.1');
    expect(meta.lastUsable).toBe('192.168.1.1');
  });

  it('should handle IPv4 /31 RFC 3021 edge case (FR-090, FR-092)', () => {
    const cidr = parseCidr('192.168.1.0/31');
    const meta = subnetMeta(cidr.network, cidr.prefix, cidr.version, cidr.bits);

    expect(meta.addressCount).toBe(2n);
    expect(meta.usableCount).toBe(2n);
    expect(meta.firstUsable).toBe('192.168.1.0');
    expect(meta.lastUsable).toBe('192.168.1.1');
  });

  it('should compute IPv6 /64 metadata', () => {
    const cidr = parseCidr('2001:db8::/64');
    const meta = subnetMeta(cidr.network, cidr.prefix, cidr.version, cidr.bits);

    expect(meta.network).toBe('2001:db8::');
    expect(meta.prefix).toBe(64);
    expect(meta.broadcast).toBeUndefined(); // IPv6 has no broadcast
    expect(meta.addressCount).toBe(1n << 64n);
    expect(meta.usableCount).toBe(1n << 64n);
  });

  it('should handle IPv6 /128 edge case (FR-090, FR-092)', () => {
    const cidr = parseCidr('2001:db8::1/128');
    const meta = subnetMeta(cidr.network, cidr.prefix, cidr.version, cidr.bits);

    expect(meta.addressCount).toBe(1n);
    expect(meta.usableCount).toBe(1n);
    expect(meta.firstUsable).toBe('2001:db8::1');
    expect(meta.lastUsable).toBe('2001:db8::1');
  });

  it('should handle IPv6 /127 point-to-point edge case (FR-090, FR-092)', () => {
    const cidr = parseCidr('2001:db8::0/127');
    const meta = subnetMeta(cidr.network, cidr.prefix, cidr.version, cidr.bits);

    expect(meta.addressCount).toBe(2n);
    expect(meta.usableCount).toBe(2n);
  });
});

describe('Format count (FR-010, FR-011)', () => {
  it('should format small counts with locale', () => {
    expect(formatCount(256n)).toBe('256');
    expect(formatCount(1000n)).toBe('1,000');
  });

  it('should format large counts with exponent', () => {
    const result = formatCount(1n << 64n, 128, 64);
    expect(result).toContain('2^64');
  });

  it('should handle very large bigints', () => {
    const huge = 1n << 100n;
    const result = formatCount(huge);
    expect(result).toContain('bigint');
  });
});

describe('Binary representation (FR-013)', () => {
  it('should show binary with prefix boundary for IPv4', () => {
    const binary = binaryWithPrefix(0xc0a80100n, 24, 32);
    expect(binary).toContain('|');
    expect(binary.split('|').length).toBe(2);
  });

  it('should show binary with prefix boundary for IPv6', () => {
    const binary = binaryWithPrefix(0x20010db80000000000000000000000n, 32, 128);
    expect(binary).toContain('|');
  });

  it('should handle /0 prefix', () => {
    const binary = binaryWithPrefix(0n, 0, 32);
    expect(binary.startsWith('|')).toBe(true);
  });

  it('should handle /32 prefix', () => {
    const binary = binaryWithPrefix(0xffffffffn, 32, 32);
    expect(binary.endsWith('|')).toBe(true);
  });
});

describe('Reverse DNS zones (FR-012)', () => {
  it('should compute IPv4 reverse DNS for /8', () => {
    const zone = reverseDnsZone(0x0a000000n, 8, 4, 32);
    expect(zone).toBe('10.in-addr.arpa');
  });

  it('should compute IPv4 reverse DNS for /16', () => {
    const zone = reverseDnsZone(0xc0a80000n, 16, 4, 32);
    expect(zone).toBe('168.192.in-addr.arpa');
  });

  it('should compute IPv4 reverse DNS for /24', () => {
    const zone = reverseDnsZone(0xc0a80100n, 24, 4, 32);
    expect(zone).toBe('1.168.192.in-addr.arpa');
  });

  it('should warn about non-standard IPv4 boundaries', () => {
    const zone = reverseDnsZone(0xc0a80100n, 25, 4, 32);
    expect(zone).toContain('Non-standard');
    expect(zone).toContain('classless delegation');
  });

  it('should compute IPv6 reverse DNS for /32', () => {
    const zone = reverseDnsZone(0x20010db8000000000000000000000000n, 32, 6, 128);
    expect(zone).toBe('8.b.d.0.1.0.0.2.ip6.arpa');
  });

  it('should warn about non-nibble IPv6 boundaries', () => {
    const zone = reverseDnsZone(0x20010db80000000000000000000000n, 33, 6, 128);
    expect(zone).toContain('Non-standard');
    expect(zone).toContain('nibble boundary');
  });
});

