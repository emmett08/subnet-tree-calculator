/**
 * Integration tests for end-to-end workflows
 */

import { describe, it, expect } from 'vitest';
import { SubnetService } from './service';
import { exportToJson, exportDesignModel, importDesignModel } from './export';
import { diffDesigns } from './changes';
import { checkEdgeCases } from './warnings';

describe('Integration Tests', () => {
  const service = new SubnetService();

  describe('Complete VLSM workflow', () => {
    it('should plan, allocate, and export a complete network design', () => {
      // 1. Parse parent network
      const parent = service.parse('10.0.0.0/16');
      expect(parent.version).toBe(4);

      // 2. Define requirements
      const requirements = [
        { name: 'Office', requiredHosts: 500 },
        { name: 'DMZ', requiredHosts: 100 },
        { name: 'Management', requiredHosts: 50 },
        { name: 'Point-to-Point', requiredHosts: 2 }
      ];

      // 3. Allocate subnets
      const allocation = service.allocateVlsm(parent, requirements, 'LARGEST_FIRST');
      const allocated = allocation.filter(a => a.allocated);
      expect(allocated).toHaveLength(4);
      expect(allocated[0]!.name).toBe('Office');

      // 4. Verify no overlaps
      const cidrs = allocated.map(a => a.cidr);
      const overlaps = service.detectOverlaps(cidrs);
      expect(overlaps.hasOverlap).toBe(false);

      // 5. Export to JSON
      const metadata = new Map(allocated.map(a => [
        service.format(a.cidr),
        { name: a.name }
      ]));
      const json = exportToJson(cidrs, metadata);
      expect(json).toContain('Office');
      expect(json).toContain('10.0');
    });
  });

  describe('Design versioning workflow', () => {
    it('should track changes between design versions', () => {
      // 1. Create initial design
      const v1Cidrs = new Map([
        ['10.0.0.0/24', service.parse('10.0.0.0/24')],
        ['10.0.1.0/24', service.parse('10.0.1.0/24')]
      ]);
      const v1Meta = new Map([
        ['10.0.0.0/24', { name: 'Office' }]
      ]);

      // 2. Create updated design
      const v2Cidrs = new Map([
        ['10.0.0.0/24', service.parse('10.0.0.0/24')],
        ['10.0.2.0/24', service.parse('10.0.2.0/24')]
      ]);
      const v2Meta = new Map([
        ['10.0.0.0/24', { name: 'Office', vlan: 100 }]
      ]);

      // 3. Diff the designs
      const changes = diffDesigns(v1Cidrs, v2Cidrs, v1Meta, v2Meta);
      
      expect(changes).toHaveLength(3);
      expect(changes.filter(c => c.type === 'REMOVED')).toHaveLength(1);
      expect(changes.filter(c => c.type === 'ADDED')).toHaveLength(1);
      expect(changes.filter(c => c.type === 'METADATA_CHANGED')).toHaveLength(1);
    });
  });

  describe('Import/Export round-trip', () => {
    it('should preserve data through export and import', () => {
      // 1. Create design with SubnetNode structure
      const nodes = [
        {
          cidr: service.parse('10.0.0.0/24'),
          metadata: { name: 'Office', vlan: 100 }
        },
        {
          cidr: service.parse('192.168.0.0/16'),
          metadata: { name: 'Home' }
        }
      ];

      // 2. Export
      const exported = exportDesignModel(nodes, 'Test Design');
      expect(JSON.parse(exported).subnets).toHaveLength(2);

      // 3. Import
      const imported = importDesignModel(exported);
      expect(imported.subnets).toHaveLength(2);
      expect(imported.subnets[0]!.metadata).toEqual({ name: 'Office', vlan: 100 });
      expect(imported.subnets[1]!.metadata).toEqual({ name: 'Home' });
    });
  });

  describe('Search and filter workflow', () => {
    it('should search, filter, and navigate subnet hierarchy', () => {
      // 1. Create subnet set
      const parent = service.parse('10.0.0.0/16');
      const child1 = service.parse('10.0.0.0/24');
      const child2 = service.parse('10.0.1.0/24');

      // 2. Verify containment
      expect(service.containsPrefix(parent, child1)).toBe(true);
      expect(service.containsPrefix(parent, child2)).toBe(true);

      // 3. Find longest prefix match
      const match = service.longestPrefixMatch('10.0.0.100', [parent, child1, child2]);
      expect(match).not.toBeNull();
      expect(match!.prefix).toBe(24);

      // 4. Summarize children
      const summary = service.summarise([child1, child2]);
      expect(summary).toHaveLength(1);
      expect(summary[0]!.prefix).toBe(23);
    });
  });

  describe('Edge case handling', () => {
    it('should detect and warn about edge cases', () => {
      // Test /31 warning
      const rfc3021 = service.parse('10.0.0.0/31');
      const warnings = checkEdgeCases(rfc3021);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]!.code).toBe('IPV4_RFC3021');

      // Test /32 info
      const hostRoute = service.parse('192.168.1.1/32');
      const hostWarnings = checkEdgeCases(hostRoute);
      expect(hostWarnings).toHaveLength(1);
      expect(hostWarnings[0]!.code).toBe('IPV4_HOST_ROUTE');

      // Test IPv6 /127
      const ipv6P2P = service.parse('2001:db8::/127');
      const ipv6Warnings = checkEdgeCases(ipv6P2P);
      expect(ipv6Warnings).toHaveLength(1);
      expect(ipv6Warnings[0]!.code).toBe('IPV6_RFC6164');
    });
  });

  describe('Complex transformation workflow', () => {
    it('should split, merge, and transform subnets correctly', () => {
      // 1. Start with a /22
      const original = service.parse('10.0.0.0/22');

      // 2. Split into 4 /24s
      const split4 = service.splitIntoN(original, 4);
      expect(split4).toHaveLength(4);
      expect(split4.every(s => s.prefix === 24)).toBe(true);

      // 3. Merge first two back
      const merged = service.mergeSiblings(split4[0]!, split4[1]!);
      expect(merged).not.toBeNull();
      expect(merged!.prefix).toBe(23);

      // 4. Verify no overlaps in final set
      const finalSet = [merged!, split4[2]!, split4[3]!];
      const overlaps = service.detectOverlaps(finalSet);
      expect(overlaps.hasOverlap).toBe(false);
    });
  });
});

