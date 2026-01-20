import { describe, it, expect } from 'vitest';
import { parseCidr } from './parser';
import {
  exportToJson,
  exportToCsv,
  exportToMarkdown,
  exportDesignModel,
  importDesignModel,
  exportToTerraform
} from './export';

describe('Export/Import (FR-070 to FR-073)', () => {
  const testCidrs = [
    parseCidr('192.168.0.0/24'),
    parseCidr('192.168.1.0/24'),
    parseCidr('10.0.0.0/16')
  ];

  describe('exportToJson', () => {
    it('should export subnets to JSON', () => {
      const json = exportToJson(testCidrs);
      const data = JSON.parse(json);

      expect(data).toHaveLength(3);
      expect(data[0].cidr).toBe('192.168.0.0/24');
      expect(data[0].network).toBe('192.168.0.0');
      expect(data[0].netmask).toBe('255.255.255.0');
      expect(data[0].addressCount).toBe('256');
    });

    it('should include metadata if provided', () => {
      const metadata = new Map([
        ['192.168.0.0/24', { name: 'DMZ', vlan: 100 }]
      ]);
      
      const json = exportToJson(testCidrs, metadata);
      const data = JSON.parse(json);
      
      expect(data[0].metadata).toEqual({ name: 'DMZ', vlan: 100 });
    });
  });

  describe('exportToCsv', () => {
    it('should export subnets to CSV', () => {
      const csv = exportToCsv(testCidrs);
      const lines = csv.split('\n');
      
      expect(lines[0]).toBe('CIDR,Network,Netmask,First Usable,Last Usable,Address Count,Usable Count');
      expect(lines[1]).toContain('192.168.0.0/24');
      expect(lines[1]).toContain('192.168.0.0');
      expect(lines[1]).toContain('255.255.255.0');
    });
  });

  describe('exportToMarkdown', () => {
    it('should export subnets to Markdown table', () => {
      const md = exportToMarkdown(testCidrs, 'Test Plan');
      
      expect(md).toContain('# Test Plan');
      expect(md).toContain('| CIDR | Network | Netmask |');
      expect(md).toContain('| 192.168.0.0/24 |');
    });
  });

  describe('exportDesignModel', () => {
    it('should export design model with metadata', () => {
      const subnets = [
        { cidr: testCidrs[0]!, metadata: { name: 'DMZ' } },
        { cidr: testCidrs[1]!, metadata: { name: 'Internal' } }
      ];

      const json = exportDesignModel(subnets, 'Test design');
      const model = JSON.parse(json);
      
      expect(model.version).toBe('1.0');
      expect(model.created).toBeDefined();
      expect(model.subnets).toHaveLength(2);
      expect(model.subnets[0].cidr).toBe('192.168.0.0/24');
      expect(model.subnets[0].metadata).toEqual({ name: 'DMZ' });
      expect(model.notes).toBe('Test design');
    });

    it('should export design model with children', () => {
      const subnets = [
        {
          cidr: parseCidr('10.0.0.0/16'),
          children: [parseCidr('10.0.0.0/24'), parseCidr('10.0.1.0/24')]
        }
      ];
      
      const json = exportDesignModel(subnets);
      const model = JSON.parse(json);
      
      expect(model.subnets[0].children).toHaveLength(2);
      expect(model.subnets[0].children[0].cidr).toBe('10.0.0.0/24');
    });
  });

  describe('importDesignModel', () => {
    it('should import valid design model', () => {
      const json = exportDesignModel([
        { cidr: testCidrs[0]!, metadata: { name: 'Test' } }
      ]);

      const model = importDesignModel(json);

      expect(model.version).toBe('1.0');
      expect(model.subnets).toHaveLength(1);
      expect(model.subnets[0]!.cidr).toBe('192.168.0.0/24');
    });

    it('should reject invalid version', () => {
      const json = JSON.stringify({ version: '2.0', subnets: [] });
      
      expect(() => importDesignModel(json)).toThrow('Unsupported design model version');
    });

    it('should reject invalid CIDR', () => {
      const json = JSON.stringify({
        version: '1.0',
        created: new Date().toISOString(),
        subnets: [{ cidr: 'invalid' }]
      });
      
      expect(() => importDesignModel(json)).toThrow('Invalid CIDR');
    });

    it('should validate round-trip', () => {
      const original = [
        { cidr: testCidrs[0]!, metadata: { name: 'DMZ', vlan: 100 } },
        { cidr: testCidrs[1]!, metadata: { name: 'Internal', vlan: 200 } }
      ];

      const exported = exportDesignModel(original, 'Round-trip test');
      const imported = importDesignModel(exported);

      expect(imported.subnets).toHaveLength(2);
      expect(imported.subnets[0]!.metadata).toEqual({ name: 'DMZ', vlan: 100 });
      expect(imported.notes).toBe('Round-trip test');
    });
  });

  describe('exportToTerraform', () => {
    it('should export to Terraform variable format', () => {
      const tf = exportToTerraform(testCidrs, 'my_subnets');
      
      expect(tf).toContain('variable "my_subnets"');
      expect(tf).toContain('type = list(object({');
      expect(tf).toContain('{ cidr = "192.168.0.0/24" }');
      expect(tf).toContain('{ cidr = "192.168.1.0/24" }');
      expect(tf).toContain('{ cidr = "10.0.0.0/16" }');
    });
  });
});

