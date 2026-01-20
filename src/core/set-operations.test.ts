/**
 * Tests for set-operations.ts (FR-030 to FR-034)
 * Covers containment, overlap detection, adjacency, union/intersection/difference
 */

import { describe, it, expect } from 'vitest';
import {
  containsIp,
  containsPrefix,
  detectOverlaps,
  areAdjacent,
  canMerge,
  unionPrefixes,
  intersectPrefixes,
  differencePrefixes,
} from './set-operations';
import { parseCidr } from './parser';

describe('IP containment (FR-030)', () => {
  it('should detect IP in prefix', () => {
    const cidr = parseCidr('192.168.1.0/24');
    expect(containsIp(cidr, '192.168.1.1')).toBe(true);
    expect(containsIp(cidr, '192.168.1.255')).toBe(true);
    expect(containsIp(cidr, '192.168.2.1')).toBe(false);
  });

  it('should handle IPv6 containment', () => {
    const cidr = parseCidr('2001:db8::/32');
    expect(containsIp(cidr, '2001:db8::1')).toBe(true);
    expect(containsIp(cidr, '2001:db9::1')).toBe(false);
  });

  it('should handle invalid IP addresses gracefully', () => {
    const cidr = parseCidr('192.168.1.0/24');
    expect(containsIp(cidr, 'invalid')).toBe(false);
  });
});

describe('Prefix containment (FR-031)', () => {
  it('should detect parent-child containment', () => {
    const parent = parseCidr('192.168.0.0/16');
    const child = parseCidr('192.168.1.0/24');
    expect(containsPrefix(parent, child)).toBe(true);
    expect(containsPrefix(child, parent)).toBe(false);
  });

  it('should detect identical prefixes', () => {
    const a = parseCidr('192.168.1.0/24');
    const b = parseCidr('192.168.1.0/24');
    expect(containsPrefix(a, b)).toBe(true);
    expect(containsPrefix(b, a)).toBe(true);
  });

  it('should reject different IP versions', () => {
    const ipv4 = parseCidr('192.168.1.0/24');
    const ipv6 = parseCidr('2001:db8::/32');
    expect(containsPrefix(ipv4, ipv6)).toBe(false);
  });
});

describe('Overlap detection (FR-032)', () => {
  it('should detect identical prefixes', () => {
    const cidrs = [
      parseCidr('192.168.1.0/24'),
      parseCidr('192.168.1.0/24'),
    ];
    const result = detectOverlaps(cidrs);

    expect(result.hasOverlap).toBe(true);
    expect(result.overlaps).toHaveLength(1);
    expect(result.overlaps[0]!.type).toBe('IDENTICAL');
  });

  it('should detect parent-child containment', () => {
    const cidrs = [
      parseCidr('192.168.0.0/16'),
      parseCidr('192.168.1.0/24'),
    ];
    const result = detectOverlaps(cidrs);

    expect(result.hasOverlap).toBe(true);
    expect(result.overlaps[0]!.type).toBe('A_CONTAINS_B');
  });

  it('should detect partial overlaps', () => {
    const cidrs = [
      parseCidr('192.168.0.0/23'),
      parseCidr('192.168.1.0/24'),
    ];
    const result = detectOverlaps(cidrs);

    expect(result.hasOverlap).toBe(true);
  });

  it('should detect no overlap for adjacent prefixes', () => {
    const cidrs = [
      parseCidr('192.168.0.0/24'),
      parseCidr('192.168.1.0/24'),
    ];
    const result = detectOverlaps(cidrs);

    expect(result.hasOverlap).toBe(false);
  });
});

describe('Adjacency (FR-033)', () => {
  it('should detect adjacent prefixes', () => {
    const a = parseCidr('192.168.0.0/24');
    const b = parseCidr('192.168.1.0/24');
    expect(areAdjacent(a, b)).toBe(true);
  });

  it('should reject non-adjacent prefixes', () => {
    const a = parseCidr('192.168.0.0/24');
    const b = parseCidr('192.168.2.0/24');
    expect(areAdjacent(a, b)).toBe(false);
  });

  it('should reject different prefix lengths', () => {
    const a = parseCidr('192.168.0.0/24');
    const b = parseCidr('192.168.1.0/25');
    expect(areAdjacent(a, b)).toBe(false);
  });
});

describe('Merge eligibility (FR-033)', () => {
  it('should detect mergeable siblings', () => {
    const a = parseCidr('192.168.0.0/25');
    const b = parseCidr('192.168.0.128/25');
    expect(canMerge(a, b)).toBe(true);
  });

  it('should reject non-siblings', () => {
    const a = parseCidr('192.168.0.0/25');
    const b = parseCidr('192.168.1.0/25');
    expect(canMerge(a, b)).toBe(false);
  });
});

describe('Union (FR-034)', () => {
  it('should combine two prefix sets', () => {
    const a = [parseCidr('192.168.0.0/24')];
    const b = [parseCidr('192.168.1.0/24')];
    const union = unionPrefixes(a, b);

    expect(union).toHaveLength(2);
  });

  it('should remove duplicates', () => {
    const a = [parseCidr('192.168.0.0/24')];
    const b = [parseCidr('192.168.0.0/24')];
    const union = unionPrefixes(a, b);

    expect(union).toHaveLength(1);
  });
});

describe('Intersection (FR-034)', () => {
  it('should find intersection of overlapping prefixes', () => {
    const a = parseCidr('192.168.0.0/16');
    const b = parseCidr('192.168.1.0/24');
    const intersection = intersectPrefixes(a, b);

    expect(intersection).not.toBeNull();
    expect(intersection!.prefix).toBe(24);
  });

  it('should return null for non-overlapping prefixes', () => {
    const a = parseCidr('192.168.0.0/24');
    const b = parseCidr('192.168.1.0/24');
    const intersection = intersectPrefixes(a, b);

    expect(intersection).toBeNull();
  });
});

describe('Difference (FR-034)', () => {
  it('should return empty when B contains A', () => {
    const a = parseCidr('192.168.1.0/24');
    const b = parseCidr('192.168.0.0/16');
    const diff = differencePrefixes(a, b);

    expect(diff).toHaveLength(0);
  });

  it('should return A when no overlap', () => {
    const a = parseCidr('192.168.0.0/24');
    const b = parseCidr('192.168.1.0/24');
    const diff = differencePrefixes(a, b);

    expect(diff).toHaveLength(1);
    expect(diff[0]).toEqual(a);
  });
});

