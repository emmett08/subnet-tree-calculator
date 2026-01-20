import { describe, it, expect } from 'vitest';
import { parseCidr } from './parser';
import {
  recordChange,
  diffDesigns,
  formatChangesAsMarkdown,
  getChangeSummary
} from './changes';

describe('Design Change Tracking (FR-080, FR-081)', () => {
  describe('recordChange', () => {
    it('should record an ADDED change', () => {
      const cidr = parseCidr('10.0.0.0/24');
      const change = recordChange('ADDED', {
        cidr: '10.0.0.0/24',
        after: cidr,
        author: 'admin',
        message: 'Added new subnet'
      });

      expect(change.type).toBe('ADDED');
      expect(change.cidr).toBe('10.0.0.0/24');
      expect(change.after).toBe(cidr);
      expect(change.before).toBeUndefined();
      expect(change.author).toBe('admin');
      expect(change.message).toBe('Added new subnet');
      expect(change.timestamp).toBeInstanceOf(Date);
    });

    it('should record a REMOVED change', () => {
      const cidr = parseCidr('192.168.0.0/16');
      const change = recordChange('REMOVED', {
        cidr: '192.168.0.0/16',
        before: cidr
      });

      expect(change.type).toBe('REMOVED');
      expect(change.before).toBe(cidr);
      expect(change.after).toBeUndefined();
    });
  });

  describe('diffDesigns', () => {
    it('should detect added CIDRs', () => {
      const before = new Map();
      const after = new Map([
        ['10.0.0.0/24', parseCidr('10.0.0.0/24')],
        ['192.168.0.0/16', parseCidr('192.168.0.0/16')]
      ]);

      const changes = diffDesigns(before, after);

      expect(changes).toHaveLength(2);
      expect(changes.every(c => c.type === 'ADDED')).toBe(true);
      expect(changes.map(c => c.cidr).sort()).toEqual(['10.0.0.0/24', '192.168.0.0/16']);
    });

    it('should detect removed CIDRs', () => {
      const before = new Map([
        ['10.0.0.0/24', parseCidr('10.0.0.0/24')],
        ['192.168.0.0/16', parseCidr('192.168.0.0/16')]
      ]);
      const after = new Map();

      const changes = diffDesigns(before, after);

      expect(changes).toHaveLength(2);
      expect(changes.every(c => c.type === 'REMOVED')).toBe(true);
    });

    it('should detect metadata changes', () => {
      const cidr = parseCidr('10.0.0.0/24');
      const before = new Map([['10.0.0.0/24', cidr]]);
      const after = new Map([['10.0.0.0/24', cidr]]);
      const beforeMetadata = new Map([['10.0.0.0/24', { name: 'Office' }]]);
      const afterMetadata = new Map([['10.0.0.0/24', { name: 'Office', vlan: 100 }]]);

      const changes = diffDesigns(before, after, beforeMetadata, afterMetadata);

      expect(changes).toHaveLength(1);
      expect(changes[0]!.type).toBe('METADATA_CHANGED');
      expect(changes[0]!.metadataBefore).toEqual({ name: 'Office' });
      expect(changes[0]!.metadataAfter).toEqual({ name: 'Office', vlan: 100 });
    });

    it('should detect no changes when designs are identical', () => {
      const cidr = parseCidr('10.0.0.0/24');
      const before = new Map([['10.0.0.0/24', cidr]]);
      const after = new Map([['10.0.0.0/24', cidr]]);
      const metadata = new Map([['10.0.0.0/24', { name: 'Office' }]]);

      const changes = diffDesigns(before, after, metadata, metadata);

      expect(changes).toHaveLength(0);
    });

    it('should detect mixed changes', () => {
      const before = new Map([
        ['10.0.0.0/24', parseCidr('10.0.0.0/24')],
        ['192.168.0.0/16', parseCidr('192.168.0.0/16')]
      ]);
      const after = new Map([
        ['10.0.0.0/24', parseCidr('10.0.0.0/24')],
        ['172.16.0.0/12', parseCidr('172.16.0.0/12')]
      ]);
      const beforeMetadata = new Map([['10.0.0.0/24', { name: 'Old' }]]);
      const afterMetadata = new Map([['10.0.0.0/24', { name: 'New' }]]);

      const changes = diffDesigns(before, after, beforeMetadata, afterMetadata);

      expect(changes).toHaveLength(3);
      expect(changes.filter(c => c.type === 'REMOVED')).toHaveLength(1);
      expect(changes.filter(c => c.type === 'ADDED')).toHaveLength(1);
      expect(changes.filter(c => c.type === 'METADATA_CHANGED')).toHaveLength(1);
    });
  });

  describe('formatChangesAsMarkdown', () => {
    it('should format changes as markdown', () => {
      const before = new Map();
      const after = new Map([
        ['10.0.0.0/24', parseCidr('10.0.0.0/24')],
        ['192.168.0.0/16', parseCidr('192.168.0.0/16')]
      ]);
      const afterMetadata = new Map([['10.0.0.0/24', { name: 'Office' }]]);

      const changes = diffDesigns(before, after, undefined, afterMetadata);
      const md = formatChangesAsMarkdown(changes);

      expect(md).toContain('# Design Changes');
      expect(md).toContain('**Total Changes:** 2');
      expect(md).toContain('## ✅ Added (2)');
      expect(md).toContain('`10.0.0.0/24`');
      expect(md).toContain('`192.168.0.0/16`');
      expect(md).toContain('Metadata: {"name":"Office"}');
    });

    it('should handle no changes', () => {
      const md = formatChangesAsMarkdown([]);
      expect(md).toBe('No changes detected.\n');
    });
  });

  describe('getChangeSummary', () => {
    it('should return change statistics', () => {
      const before = new Map([
        ['10.0.0.0/24', parseCidr('10.0.0.0/24')],
        ['192.168.0.0/16', parseCidr('192.168.0.0/16')]
      ]);
      const after = new Map([
        ['10.0.0.0/24', parseCidr('10.0.0.0/24')],
        ['172.16.0.0/12', parseCidr('172.16.0.0/12')]
      ]);
      const beforeMetadata = new Map([['10.0.0.0/24', { name: 'Old' }]]);
      const afterMetadata = new Map([['10.0.0.0/24', { name: 'New' }]]);

      const changes = diffDesigns(before, after, beforeMetadata, afterMetadata);
      const summary = getChangeSummary(changes);

      expect(summary.added).toBe(1);
      expect(summary.removed).toBe(1);
      expect(summary.modified).toBe(1);
      expect(summary.total).toBe(3);
    });

    it('should return zeros for no changes', () => {
      const summary = getChangeSummary([]);
      expect(summary.added).toBe(0);
      expect(summary.removed).toBe(0);
      expect(summary.modified).toBe(0);
      expect(summary.total).toBe(0);
    });
  });
});

