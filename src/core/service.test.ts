import { describe, it, expect } from 'vitest';
import { SubnetService } from './service';
import { parseCidr } from './parser';

describe('SubnetService (FR-074)', () => {
  const service = new SubnetService();

  describe('parse and format', () => {
    it('should parse IPv4 CIDR', () => {
      const cidr = service.parse('192.168.1.0/24');
      expect(cidr.version).toBe(4);
      expect(cidr.prefix).toBe(24);
    });

    it('should parse IPv6 CIDR', () => {
      const cidr = service.parse('2001:db8::/32');
      expect(cidr.version).toBe(6);
      expect(cidr.prefix).toBe(32);
    });

    it('should format CIDR', () => {
      const cidr = service.parse('10.0.0.0/8');
      const formatted = service.format(cidr);
      expect(formatted).toBe('10.0.0.0/8');
    });
  });

  describe('parseWithNetmask', () => {
    it('should parse IPv4 with netmask', () => {
      const cidr = service.parseWithNetmask('192.168.1.0', '255.255.255.0');
      expect(cidr.prefix).toBe(24);
    });
  });

  describe('rangeToMinimalPrefixes', () => {
    it('should convert range to minimal prefixes', () => {
      const prefixes = service.rangeToMinimalPrefixes('10.0.0.0', '10.0.0.255');
      expect(prefixes).toHaveLength(1);
      expect(prefixes[0]!.prefix).toBe(24);
    });
  });

  describe('classifyAddress', () => {
    it('should classify private IPv4', () => {
      const classes = service.classifyAddress('192.168.1.1');
      expect(classes).toContain('PRIVATE');
    });
  });

  describe('getMetadata', () => {
    it('should get subnet metadata', () => {
      const cidr = service.parse('192.168.0.0/24');
      const meta = service.getMetadata(cidr.network, cidr.prefix, cidr.version, cidr.bits);
      expect(meta.addressCount).toBe(256n);
      expect(meta.usableCount).toBe(254n);
    });
  });

  describe('transformations', () => {
    it('should split binary', () => {
      const cidr = service.parse('10.0.0.0/8');
      const [left, right] = service.splitBinary(cidr);
      expect(left.prefix).toBe(9);
      expect(right.prefix).toBe(9);
    });

    it('should split into N', () => {
      const cidr = service.parse('10.0.0.0/8');
      const subnets = service.splitIntoN(cidr, 4);
      expect(subnets).toHaveLength(4);
      expect(subnets[0]!.prefix).toBe(10);
    });

    it('should merge siblings', () => {
      const cidr = service.parse('10.0.0.0/8');
      const [left, right] = service.splitBinary(cidr);
      const merged = service.mergeSiblings(left, right);
      expect(merged.prefix).toBe(8);
    });

    it('should summarise prefixes', () => {
      const cidrs = [
        service.parse('10.0.0.0/24'),
        service.parse('10.0.1.0/24')
      ];
      const summary = service.summarise(cidrs);
      expect(summary).toHaveLength(1);
      expect(summary[0]!.prefix).toBe(23);
    });
  });

  describe('set operations', () => {
    it('should check IP containment', () => {
      const cidr = service.parse('192.168.0.0/24');
      expect(service.containsIp(cidr, '192.168.0.100')).toBe(true);
      expect(service.containsIp(cidr, '192.168.1.100')).toBe(false);
    });

    it('should check prefix containment', () => {
      const parent = service.parse('10.0.0.0/8');
      const child = service.parse('10.1.0.0/16');
      expect(service.containsPrefix(parent, child)).toBe(true);
    });

    it('should detect overlaps', () => {
      const cidrs = [
        service.parse('10.0.0.0/16'),
        service.parse('10.0.1.0/24')
      ];
      const result = service.detectOverlaps(cidrs);
      expect(result.hasOverlap).toBe(true);
    });

    it('should check adjacency', () => {
      const a = service.parse('10.0.0.0/24');
      const b = service.parse('10.0.1.0/24');
      expect(service.areAdjacent(a, b)).toBe(true);
    });

    it('should compute union', () => {
      const a = [service.parse('10.0.0.0/24')];
      const b = [service.parse('10.0.1.0/24')];
      const union = service.union(a, b);
      expect(union).toHaveLength(2); // Union combines sets, doesn't merge
      expect(union.some(c => c.prefix === 24)).toBe(true);
    });
  });

  describe('VLSM allocation', () => {
    it('should allocate VLSM subnets', () => {
      const parent = service.parse('10.0.0.0/16');
      const requests = [
        { name: 'Large', requiredHosts: 1000, metadata: { purpose: 'servers' } },
        { name: 'Medium', requiredHosts: 100, metadata: { purpose: 'workstations' } }
      ];
      const allocations = service.allocateVlsm(parent, requests);
      expect(allocations).toHaveLength(2);
      expect(allocations[0]!.allocated).toBeDefined();
    });
  });

  describe('longestPrefixMatch (FR-061)', () => {
    it('should find longest prefix match for IPv4', () => {
      const cidrs = [
        service.parse('10.0.0.0/8'),
        service.parse('10.1.0.0/16'),
        service.parse('10.1.2.0/24')
      ];

      const match = service.longestPrefixMatch('10.1.2.100', cidrs);
      expect(match).not.toBeNull();
      expect(match!.prefix).toBe(24);
    });

    it('should find longest prefix match for IPv6', () => {
      const cidrs = [
        service.parse('2001:db8::/32'),
        service.parse('2001:db8:1::/48'),
        service.parse('2001:db8:1:2::/64')
      ];

      const match = service.longestPrefixMatch('2001:db8:1:2::100', cidrs);
      expect(match).not.toBeNull();
      expect(match!.prefix).toBe(64);
    });

    it('should return null when no match found', () => {
      const cidrs = [
        service.parse('10.0.0.0/8'),
        service.parse('192.168.0.0/16')
      ];

      const match = service.longestPrefixMatch('172.16.0.1', cidrs);
      expect(match).toBeNull();
    });

    it('should return null for empty array', () => {
      const match = service.longestPrefixMatch('10.0.0.1', []);
      expect(match).toBeNull();
    });

    it('should prefer more specific prefix', () => {
      const cidrs = [
        service.parse('0.0.0.0/0'),  // Default route
        service.parse('10.0.0.0/8'),
        service.parse('10.1.0.0/16'),
        service.parse('10.1.1.0/24')
      ];

      const match = service.longestPrefixMatch('10.1.1.50', cidrs);
      expect(match!.prefix).toBe(24);
    });

    it('should handle single matching prefix', () => {
      const cidrs = [service.parse('192.168.0.0/24')];
      const match = service.longestPrefixMatch('192.168.0.1', cidrs);
      expect(match).not.toBeNull();
      expect(match!.prefix).toBe(24);
    });

    it('should handle multiple non-overlapping prefixes', () => {
      const cidrs = [
        service.parse('10.0.0.0/24'),
        service.parse('192.168.0.0/24'),
        service.parse('172.16.0.0/24')
      ];

      const match = service.longestPrefixMatch('192.168.0.100', cidrs);
      expect(match).not.toBeNull();
      expect(service.format(match!)).toBe('192.168.0.0/24');
    });

    it('should handle /32 host routes', () => {
      const cidrs = [
        service.parse('10.0.0.0/24'),
        service.parse('10.0.0.1/32')
      ];

      const match = service.longestPrefixMatch('10.0.0.1', cidrs);
      expect(match!.prefix).toBe(32);
    });

    it('should handle /128 IPv6 host routes', () => {
      const cidrs = [
        service.parse('2001:db8::/64'),
        service.parse('2001:db8::1/128')
      ];

      const match = service.longestPrefixMatch('2001:db8::1', cidrs);
      expect(match!.prefix).toBe(128);
    });
  });
});
