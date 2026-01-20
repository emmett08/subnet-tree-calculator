import { describe, it, expect } from 'vitest';
import {
  splitBinary,
  splitIntoN,
  splitByHostCount,
  mergeSiblings,
  summarizePrefixes,
  minimalCoveringSupernet,
} from './transformations';
import { parseCidr } from './parser';

describe('Binary split', () => {
  it('should split IPv4 /24 into two /25s', () => {
    const parent = parseCidr('192.168.1.0/24');
    const [left, right] = splitBinary(parent);

    expect(left.prefix).toBe(25);
    expect(right.prefix).toBe(25);
    expect(left.network).toBe(0xc0a80100n); // 192.168.1.0
    expect(right.network).toBe(0xc0a80180n); // 192.168.1.128
  });

  it('should split IPv6 /48 into two /49s', () => {
    const parent = parseCidr('2001:db8::/48');
    const [left, right] = splitBinary(parent);

    expect(left.prefix).toBe(49);
    expect(right.prefix).toBe(49);
  });

  it('should throw when splitting maximum prefix', () => {
    const ipv4Max = parseCidr('192.168.1.1/32');
    expect(() => splitBinary(ipv4Max)).toThrow();

    const ipv6Max = parseCidr('2001:db8::1/128');
    expect(() => splitBinary(ipv6Max)).toThrow();
  });

  it('should maintain parent-child relationship', () => {
    const parent = parseCidr('10.0.0.0/16');
    const [left, right] = splitBinary(parent);

    // Both children should be within parent range
    const parentSize = 1n << BigInt(32 - parent.prefix);
    const childSize = 1n << BigInt(32 - left.prefix);

    expect(left.network).toBe(parent.network);
    expect(right.network).toBe(parent.network + childSize);
    expect(childSize * 2n).toBe(parentSize);
  });
});

describe('Split into N subnets', () => {
  it('should split /24 into 4 /26s', () => {
    const parent = parseCidr('192.168.1.0/24');
    const subnets = splitIntoN(parent, 4);

    expect(subnets).toHaveLength(4);
    expect(subnets[0]!.prefix).toBe(26);
    expect(subnets[0]!.network).toBe(0xc0a80100n); // 192.168.1.0
    expect(subnets[1]!.network).toBe(0xc0a80140n); // 192.168.1.64
    expect(subnets[2]!.network).toBe(0xc0a80180n); // 192.168.1.128
    expect(subnets[3]!.network).toBe(0xc0a801c0n); // 192.168.1.192
  });

  it('should reject non-power-of-2', () => {
    const parent = parseCidr('10.0.0.0/16');
    expect(() => splitIntoN(parent, 3)).toThrow();
    expect(() => splitIntoN(parent, 5)).toThrow();
  });

  it('should handle edge cases', () => {
    const parent = parseCidr('10.0.0.0/30');
    const subnets = splitIntoN(parent, 4);
    expect(subnets).toHaveLength(4);
    expect(subnets[0]!.prefix).toBe(32);
  });
});

describe('Split by host count', () => {
  it('should allocate subnet for 100 hosts (IPv4)', () => {
    const parent = parseCidr('10.0.0.0/16');
    const result = splitByHostCount(parent, 100);

    // Need 100 + 2 (network + broadcast) = 102 addresses
    // Next power of 2 is 128 = 2^7, so /25
    expect(result.prefix).toBe(25);
  });

  it('should handle /31 special case (2 hosts)', () => {
    const parent = parseCidr('10.0.0.0/24');
    const result = splitByHostCount(parent, 2);

    expect(result.prefix).toBe(31);
  });

  it('should handle /32 special case (1 host)', () => {
    const parent = parseCidr('10.0.0.0/24');
    const result = splitByHostCount(parent, 1);

    expect(result.prefix).toBe(32);
  });

  it('should work for IPv6', () => {
    const parent = parseCidr('2001:db8::/48');
    const result = splitByHostCount(parent, 1000);

    // IPv6: all addresses usable, need 2^10 = 1024
    expect(result.prefix).toBe(118); // 128 - 10
  });
});

describe('Merge siblings', () => {
  it('should merge two /25s into /24', () => {
    const left = parseCidr('192.168.1.0/25');
    const right = parseCidr('192.168.1.128/25');

    const parent = mergeSiblings(left, right);

    expect(parent.prefix).toBe(24);
    expect(parent.network).toBe(0xc0a80100n);
  });

  it('should reject non-siblings', () => {
    const a = parseCidr('192.168.1.0/25');
    const b = parseCidr('192.168.2.0/25');

    expect(() => mergeSiblings(a, b)).toThrow();
  });

  it('should reject different prefix lengths', () => {
    const a = parseCidr('192.168.1.0/24');
    const b = parseCidr('192.168.2.0/25');

    expect(() => mergeSiblings(a, b)).toThrow();
  });

  it('should be inverse of split', () => {
    const parent = parseCidr('10.0.0.0/16');
    const [left, right] = splitBinary(parent);
    const merged = mergeSiblings(left, right);

    expect(merged.network).toBe(parent.network);
    expect(merged.prefix).toBe(parent.prefix);
  });
});

describe('Summarize prefixes', () => {
  it('should merge adjacent siblings', () => {
    const cidrs = [parseCidr('192.168.1.0/25'), parseCidr('192.168.1.128/25')];

    const summary = summarizePrefixes(cidrs);

    expect(summary).toHaveLength(1);
    expect(summary[0]!.prefix).toBe(24);
  });

  it('should handle multiple levels of merging', () => {
    const cidrs = [
      parseCidr('10.0.0.0/26'),
      parseCidr('10.0.0.64/26'),
      parseCidr('10.0.0.128/26'),
      parseCidr('10.0.0.192/26'),
    ];

    const summary = summarizePrefixes(cidrs);

    expect(summary).toHaveLength(1);
    expect(summary[0]!.prefix).toBe(24);
  });

  it('should not merge non-adjacent prefixes', () => {
    const cidrs = [parseCidr('192.168.1.0/24'), parseCidr('192.168.3.0/24')];

    const summary = summarizePrefixes(cidrs);

    expect(summary).toHaveLength(2);
  });
});

describe('Minimal covering supernet', () => {
  it('should find supernet for adjacent prefixes', () => {
    const cidrs = [parseCidr('192.168.1.0/24'), parseCidr('192.168.2.0/24')];

    const supernet = minimalCoveringSupernet(cidrs);

    expect(supernet.prefix).toBeLessThanOrEqual(23);
  });

  it('should handle single prefix', () => {
    const cidrs = [parseCidr('10.0.0.0/16')];

    const supernet = minimalCoveringSupernet(cidrs);

    expect(supernet.network).toBe(cidrs[0]!.network);
    expect(supernet.prefix).toBe(cidrs[0]!.prefix);
  });
});

