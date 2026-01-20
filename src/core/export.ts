/**
 * Export/Import functionality (FR-070 to FR-073)
 */

import type { NormalisedCidr } from './types';
import { formatCidr, parseCidr } from './parser';
import { subnetMeta } from './calculations';

/**
 * Subnet data for export
 */
export type SubnetExportData = {
  cidr: string;
  network: string;
  netmask: string;
  firstUsable?: string;
  lastUsable?: string;
  addressCount: string;
  usableCount: string;
  reverseDns?: string;
  classification?: string[];
  metadata?: Record<string, unknown>;
};

/**
 * Design model for export/import
 */
export type DesignModel = {
  version: string;
  created: string;
  subnets: Array<{
    cidr: string;
    metadata?: Record<string, unknown>;
    children?: Array<{ cidr: string; metadata?: Record<string, unknown> }>;
  }>;
  notes?: string;
};

/**
 * Export subnets to JSON (FR-070)
 */
export function exportToJson(cidrs: NormalisedCidr[], metadata?: Map<string, Record<string, unknown>>): string {
  const data = cidrs.map((cidr) => {
    const meta = subnetMeta(cidr.network, cidr.prefix, cidr.version, cidr.bits);
    const cidrStr = formatCidr(cidr.version, cidr.network, cidr.prefix);

    return {
      cidr: cidrStr,
      network: meta.network,
      netmask: meta.netmask,
      firstUsable: meta.firstUsable,
      lastUsable: meta.lastUsable,
      addressCount: meta.addressCount.toString(),
      usableCount: meta.usableCount.toString(),
      metadata: metadata?.get(cidrStr)
    };
  });

  return JSON.stringify(data, null, 2);
}

/**
 * Export subnets to CSV (FR-070)
 */
export function exportToCsv(cidrs: NormalisedCidr[]): string {
  const headers = ['CIDR', 'Network', 'Netmask', 'First Usable', 'Last Usable', 'Address Count', 'Usable Count'];
  const rows = cidrs.map((cidr) => {
    const meta = subnetMeta(cidr.network, cidr.prefix, cidr.version, cidr.bits);
    return [
      formatCidr(cidr.version, cidr.network, cidr.prefix),
      meta.network,
      meta.netmask,
      meta.firstUsable || 'n/a',
      meta.lastUsable || 'n/a',
      meta.addressCount.toString(),
      meta.usableCount.toString()
    ];
  });

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

/**
 * Export subnets to Markdown (FR-070)
 */
export function exportToMarkdown(cidrs: NormalisedCidr[], title = 'Subnet Plan'): string {
  const lines = [
    `# ${title}`,
    '',
    '| CIDR | Network | Netmask | First Usable | Last Usable | Address Count | Usable Count |',
    '|------|---------|---------|--------------|-------------|---------------|--------------|'
  ];

  for (const cidr of cidrs) {
    const meta = subnetMeta(cidr.network, cidr.prefix, cidr.version, cidr.bits);
    lines.push(
      `| ${formatCidr(cidr.version, cidr.network, cidr.prefix)} | ${meta.network} | ${meta.netmask} | ${meta.firstUsable || 'n/a'} | ${meta.lastUsable || 'n/a'} | ${meta.addressCount} | ${meta.usableCount} |`
    );
  }

  return lines.join('\n');
}

/**
 * Export design model (FR-071)
 */
export function exportDesignModel(
  subnets: Array<{ cidr: NormalisedCidr; metadata?: Record<string, unknown>; children?: NormalisedCidr[] }>,
  notes?: string
): string {
  const model: DesignModel = {
    version: '1.0',
    created: new Date().toISOString(),
    subnets: subnets.map(s => ({
      cidr: formatCidr(s.cidr.version, s.cidr.network, s.cidr.prefix),
      metadata: s.metadata,
      children: s.children?.map(c => ({ cidr: formatCidr(c.version, c.network, c.prefix) }))
    })),
    notes
  };

  return JSON.stringify(model, null, 2);
}

/**
 * Import design model (FR-072)
 */
export function importDesignModel(json: string): DesignModel {
  const model = JSON.parse(json) as DesignModel;
  
  // Validate version
  if (!model.version || model.version !== '1.0') {
    throw new Error('Unsupported design model version');
  }

  // Validate subnets
  if (!Array.isArray(model.subnets)) {
    throw new Error('Invalid design model: subnets must be an array');
  }

  // Validate each subnet can be parsed
  for (const subnet of model.subnets) {
    try {
      parseCidr(subnet.cidr);
    } catch (err) {
      throw new Error(`Invalid CIDR in design model: ${subnet.cidr}`);
    }
  }

  return model;
}

/**
 * Export IaC-friendly artifacts (FR-073)
 * Terraform variable format
 */
export function exportToTerraform(cidrs: NormalisedCidr[], varName = 'subnets'): string {
  const lines = [`variable "${varName}" {`, '  type = list(object({', '    cidr = string', '  }))', '  default = ['];

  for (const cidr of cidrs) {
    lines.push(`    { cidr = "${formatCidr(cidr.version, cidr.network, cidr.prefix)}" },`);
  }

  lines.push('  ]', '}');
  return lines.join('\n');
}

