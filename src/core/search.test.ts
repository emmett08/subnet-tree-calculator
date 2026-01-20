import { describe, it, expect } from 'vitest';
import { parseCidr } from './parser';
import {
  searchByMetadata,
  filterSubnets,
  getParentPrefixes,
  getParent,
  getChildren,
  findDescendants,
  findAncestors
} from './search';

describe('Search and Filter (FR-060, FR-062, FR-063)', () => {
  describe('searchByMetadata (FR-060)', () => {
    const subnets = [
      { cidr: parseCidr('10.0.0.0/24'), metadata: { name: 'Office Network', vlan: 100 } },
      { cidr: parseCidr('192.168.0.0/16'), metadata: { name: 'Home Network', type: 'residential' } },
      { cidr: parseCidr('172.16.0.0/12'), metadata: { environment: 'production', region: 'us-east' } }
    ];

    it('should search by metadata key', () => {
      const results = searchByMetadata(subnets, 'vlan');
      expect(results).toHaveLength(1);
      expect(results[0]!.metadata?.name).toBe('Office Network');
    });

    it('should search by metadata value', () => {
      const results = searchByMetadata(subnets, 'production');
      expect(results).toHaveLength(1);
      expect(results[0]!.metadata?.environment).toBe('production');
    });

    it('should be case-insensitive', () => {
      const results = searchByMetadata(subnets, 'OFFICE');
      expect(results).toHaveLength(1);
    });

    it('should return empty array for no matches', () => {
      const results = searchByMetadata(subnets, 'nonexistent');
      expect(results).toHaveLength(0);
    });

    it('should skip subnets without metadata', () => {
      const withoutMeta = [{ cidr: parseCidr('10.0.0.0/8'), metadata: undefined }];
      const results = searchByMetadata(withoutMeta, 'anything');
      expect(results).toHaveLength(0);
    });
  });

  describe('filterSubnets (FR-063)', () => {
    const subnets = [
      { cidr: parseCidr('10.0.0.0/24'), metadata: { env: 'prod' }, status: 'VALID' as const },
      { cidr: parseCidr('192.168.0.0/16'), metadata: { env: 'dev' }, status: 'VALID' as const },
      { cidr: parseCidr('2001:db8::/32'), metadata: { env: 'prod' }, status: 'RESERVED' as const },
      { cidr: parseCidr('172.16.0.0/30'), metadata: { env: 'test' }, status: 'DEPRECATED' as const }
    ];

    it('should filter by IP version', () => {
      const results = filterSubnets(subnets, { version: 6 });
      expect(results).toHaveLength(1);
      expect(results[0]!.cidr.version).toBe(6);
    });

    it('should filter by minimum prefix', () => {
      const results = filterSubnets(subnets, { minPrefix: 24 });
      expect(results).toHaveLength(3); // /24, /30, and /32 all have prefix >= 24
      expect(results.every(s => s.cidr.prefix >= 24)).toBe(true);
    });

    it('should filter by maximum prefix', () => {
      const results = filterSubnets(subnets, { maxPrefix: 24 });
      expect(results).toHaveLength(2);
      expect(results.every(s => s.cidr.prefix <= 24)).toBe(true);
    });

    it('should filter by status', () => {
      const results = filterSubnets(subnets, { status: 'VALID' });
      expect(results).toHaveLength(2);
      expect(results.every(s => s.status === 'VALID')).toBe(true);
    });

    it('should filter by metadata', () => {
      const results = filterSubnets(subnets, { metadata: { env: 'prod' } });
      expect(results).toHaveLength(2);
      expect(results.every(s => s.metadata!.env === 'prod')).toBe(true);
    });

    it('should combine multiple filters', () => {
      const results = filterSubnets(subnets, {
        version: 4,
        minPrefix: 16,
        status: 'VALID'
      });
      expect(results).toHaveLength(2);
    });
  });

  describe('getParentPrefixes (FR-062)', () => {
    it('should get all parent prefixes for IPv4', () => {
      const cidr = parseCidr('10.0.0.0/24');
      const parents = getParentPrefixes(cidr);

      expect(parents).toHaveLength(24);
      expect(parents[0]!.prefix).toBe(23);
      expect(parents[23]!.prefix).toBe(0);
    });

    it('should get all parent prefixes for IPv6', () => {
      const cidr = parseCidr('2001:db8::/64');
      const parents = getParentPrefixes(cidr);

      expect(parents).toHaveLength(64);
      expect(parents[0]!.prefix).toBe(63);
      expect(parents[63]!.prefix).toBe(0);
    });

    it('should return empty array for /0', () => {
      const cidr = parseCidr('0.0.0.0/0');
      const parents = getParentPrefixes(cidr);
      
      expect(parents).toHaveLength(0);
    });
  });

  describe('getParent (FR-062)', () => {
    it('should get immediate parent', () => {
      const cidr = parseCidr('10.0.0.0/24');
      const parent = getParent(cidr);
      
      expect(parent).not.toBeNull();
      expect(parent!.prefix).toBe(23);
      expect(parent!.network).toBe(cidr.network);
    });

    it('should return null for /0', () => {
      const cidr = parseCidr('0.0.0.0/0');
      const parent = getParent(cidr);
      
      expect(parent).toBeNull();
    });
  });

  describe('getChildren (FR-062)', () => {
    it('should get child prefixes', () => {
      const cidr = parseCidr('10.0.0.0/23');
      const children = getChildren(cidr);

      expect(children).not.toBeNull();
      expect(children![0]!.prefix).toBe(24);
      expect(children![1]!.prefix).toBe(24);
      expect(children![0]!.network).toBe(167772160n); // 10.0.0.0
      expect(children![1]!.network).toBe(167772416n); // 10.0.1.0
    });

    it('should return null for /32', () => {
      const cidr = parseCidr('10.0.0.1/32');
      const children = getChildren(cidr);
      
      expect(children).toBeNull();
    });

    it('should return null for /128', () => {
      const cidr = parseCidr('2001:db8::1/128');
      const children = getChildren(cidr);
      
      expect(children).toBeNull();
    });
  });

  describe('findDescendants (FR-062)', () => {
    it('should find all descendants', () => {
      const parent = parseCidr('10.0.0.0/16');
      const candidates = [
        parseCidr('10.0.0.0/24'),
        parseCidr('10.0.1.0/24'),
        parseCidr('192.168.0.0/24'),
        parseCidr('10.0.0.0/8')
      ];
      
      const descendants = findDescendants(parent, candidates);
      
      expect(descendants).toHaveLength(2);
      expect(descendants.every(d => d.prefix > parent.prefix)).toBe(true);
    });
  });

  describe('findAncestors (FR-062)', () => {
    it('should find all ancestors', () => {
      const child = parseCidr('10.0.0.0/24');
      const candidates = [
        parseCidr('10.0.0.0/16'),
        parseCidr('10.0.0.0/8'),
        parseCidr('192.168.0.0/16'),
        parseCidr('10.0.1.0/24')
      ];
      
      const ancestors = findAncestors(child, candidates);
      
      expect(ancestors).toHaveLength(2);
      expect(ancestors.every(a => a.prefix < child.prefix)).toBe(true);
    });
  });
});

