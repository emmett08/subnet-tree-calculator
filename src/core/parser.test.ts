import { describe, it, expect } from 'vitest';
import {
  ipv4ToBigInt,
  bigIntToIpv4,
  ipv6ToBigInt,
  bigIntToIpv6,
  parseCidr,
  parseCidrWithNetmask,
  rangeToMinimalPrefixes,
  classifyAddress,
  parseCidrSafe,
  formatCidr,
  maskFromPrefix,
} from './parser';
import { AddressClass } from './types';

describe('IPv4 parsing', () => {
  it('should parse valid IPv4 addresses', () => {
    expect(ipv4ToBigInt('192.168.1.1')).toBe(0xc0a80101n);
    expect(ipv4ToBigInt('10.0.0.0')).toBe(0x0a000000n);
    expect(ipv4ToBigInt('255.255.255.255')).toBe(0xffffffffn);
    expect(ipv4ToBigInt('0.0.0.0')).toBe(0n);
  });

  it('should format IPv4 addresses', () => {
    expect(bigIntToIpv4(0xc0a80101n)).toBe('192.168.1.1');
    expect(bigIntToIpv4(0x0a000000n)).toBe('10.0.0.0');
    expect(bigIntToIpv4(0xffffffffn)).toBe('255.255.255.255');
  });

  it('should reject invalid IPv4 addresses', () => {
    expect(() => ipv4ToBigInt('256.1.1.1')).toThrow();
    expect(() => ipv4ToBigInt('1.1.1')).toThrow();
    expect(() => ipv4ToBigInt('1.1.1.1.1')).toThrow();
    expect(() => ipv4ToBigInt('abc.def.ghi.jkl')).toThrow();
  });

  it('should round-trip IPv4 addresses', () => {
    const addresses = ['192.168.1.1', '10.0.0.0', '172.16.0.1', '8.8.8.8'];
    for (const addr of addresses) {
      expect(bigIntToIpv4(ipv4ToBigInt(addr))).toBe(addr);
    }
  });
});

describe('IPv6 parsing', () => {
  it('should parse valid IPv6 addresses', () => {
    expect(ipv6ToBigInt('2001:db8::1')).toBe(0x20010db8000000000000000000000001n);
    expect(ipv6ToBigInt('::1')).toBe(1n);
    expect(ipv6ToBigInt('::')).toBe(0n);
    expect(ipv6ToBigInt('fe80::1')).toBe(0xfe800000000000000000000000000001n);
  });

  it('should format IPv6 addresses with compression', () => {
    expect(bigIntToIpv6(0x20010db8000000000000000000000001n)).toBe('2001:db8::1');
    expect(bigIntToIpv6(1n)).toBe('::1');
    expect(bigIntToIpv6(0n)).toBe('::');
  });

  it('should handle full IPv6 addresses', () => {
    const full = '2001:0db8:0000:0000:0000:0000:0000:0001';
    const compressed = '2001:db8::1';
    expect(bigIntToIpv6(ipv6ToBigInt(full))).toBe(compressed);
  });

  it('should reject invalid IPv6 addresses', () => {
    expect(() => ipv6ToBigInt(':::')).toThrow();
    expect(() => ipv6ToBigInt('gggg::1')).toThrow();
    expect(() => ipv6ToBigInt('1:2:3:4:5:6:7:8:9')).toThrow();
  });
});

describe('CIDR parsing', () => {
  it('should parse IPv4 CIDR notation', () => {
    const cidr = parseCidr('192.168.1.0/24');
    expect(cidr.version).toBe(4);
    expect(cidr.prefix).toBe(24);
    expect(cidr.network).toBe(0xc0a80100n);
  });

  it('should parse IPv6 CIDR notation', () => {
    const cidr = parseCidr('2001:db8::/32');
    expect(cidr.version).toBe(6);
    expect(cidr.prefix).toBe(32);
    expect(cidr.network).toBe(0x20010db8000000000000000000000000n);
  });

  it('should normalize network address', () => {
    const cidr = parseCidr('192.168.1.5/24');
    expect(cidr.network).toBe(0xc0a80100n); // Should be 192.168.1.0
  });

  it('should reject invalid CIDR notation', () => {
    expect(() => parseCidr('192.168.1.0')).toThrow();
    expect(() => parseCidr('192.168.1.0/33')).toThrow();
    expect(() => parseCidr('2001:db8::/129')).toThrow();
  });

  it('should handle safe parsing', () => {
    const valid = parseCidrSafe('10.0.0.0/8');
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.value.prefix).toBe(8);
    }

    const invalid = parseCidrSafe('invalid');
    expect(invalid.ok).toBe(false);
  });
});

describe('Netmask parsing', () => {
  it('should parse IPv4 with netmask', () => {
    const cidr = parseCidrWithNetmask('192.168.1.0', '255.255.255.0');
    expect(cidr.prefix).toBe(24);
    expect(cidr.network).toBe(0xc0a80100n);
  });

  it('should handle various netmasks', () => {
    expect(parseCidrWithNetmask('10.0.0.0', '255.0.0.0').prefix).toBe(8);
    expect(parseCidrWithNetmask('172.16.0.0', '255.255.0.0').prefix).toBe(16);
    expect(parseCidrWithNetmask('192.168.1.0', '255.255.255.252').prefix).toBe(30);
  });
});

describe('Range to prefixes conversion', () => {
  it('should convert simple range to single prefix', () => {
    const prefixes = rangeToMinimalPrefixes('192.168.1.0', '192.168.1.255');
    expect(prefixes).toHaveLength(1);
    expect(prefixes[0]!.prefix).toBe(24);
  });

  it('should convert complex range to multiple prefixes', () => {
    const prefixes = rangeToMinimalPrefixes('192.168.1.0', '192.168.2.255');
    expect(prefixes.length).toBeGreaterThan(1);
    // Should cover 192.168.1.0/24 and 192.168.2.0/24
  });

  it('should handle single IP range', () => {
    const prefixes = rangeToMinimalPrefixes('192.168.1.1', '192.168.1.1');
    expect(prefixes).toHaveLength(1);
    expect(prefixes[0]!.prefix).toBe(32);
  });
});

describe('Address classification', () => {
  it('should classify IPv4 private addresses', () => {
    expect(classifyAddress('10.0.0.1')).toContain(AddressClass.PRIVATE);
    expect(classifyAddress('172.16.0.1')).toContain(AddressClass.PRIVATE);
    expect(classifyAddress('192.168.1.1')).toContain(AddressClass.PRIVATE);
  });

  it('should classify IPv4 special addresses', () => {
    expect(classifyAddress('127.0.0.1')).toContain(AddressClass.LOOPBACK);
    expect(classifyAddress('169.254.1.1')).toContain(AddressClass.LINK_LOCAL);
    expect(classifyAddress('224.0.0.1')).toContain(AddressClass.MULTICAST);
    expect(classifyAddress('192.0.2.1')).toContain(AddressClass.DOCUMENTATION);
  });

  it('should classify IPv6 addresses', () => {
    expect(classifyAddress('::1')).toContain(AddressClass.LOOPBACK);
    expect(classifyAddress('fe80::1')).toContain(AddressClass.LINK_LOCAL);
    expect(classifyAddress('fc00::1')).toContain(AddressClass.UNIQUE_LOCAL);
    expect(classifyAddress('ff02::1')).toContain(AddressClass.MULTICAST);
    expect(classifyAddress('2001:db8::1')).toContain(AddressClass.DOCUMENTATION);
  });
});

