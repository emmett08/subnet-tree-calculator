/**
 * Design change tracking and diffing (FR-080, FR-081)
 */

import type { NormalisedCidr } from './types';
import { formatCidr } from './parser';

export type ChangeType = 'ADDED' | 'REMOVED' | 'MODIFIED' | 'METADATA_CHANGED';

export type Change = {
  type: ChangeType;
  cidr: string;
  before?: NormalisedCidr;
  after?: NormalisedCidr;
  metadataBefore?: Record<string, unknown>;
  metadataAfter?: Record<string, unknown>;
  timestamp: Date;
  author?: string;
  message?: string;
};

export type DesignHistory = {
  designId: string;
  changes: Change[];
};

/**
 * Record a change
 */
export function recordChange(
  type: ChangeType,
  options: {
    cidr: string;
    before?: NormalisedCidr;
    after?: NormalisedCidr;
    metadataBefore?: Record<string, unknown>;
    metadataAfter?: Record<string, unknown>;
    author?: string;
    message?: string;
  }
): Change {
  return {
    type,
    cidr: options.cidr,
    before: options.before,
    after: options.after,
    metadataBefore: options.metadataBefore,
    metadataAfter: options.metadataAfter,
    timestamp: new Date(),
    author: options.author,
    message: options.message
  };
}

/**
 * Diff two sets of CIDRs (FR-081)
 */
export function diffDesigns(
  before: Map<string, NormalisedCidr>,
  after: Map<string, NormalisedCidr>,
  beforeMetadata?: Map<string, Record<string, unknown>>,
  afterMetadata?: Map<string, Record<string, unknown>>
): Change[] {
  const changes: Change[] = [];

  // Find removed CIDRs
  for (const [cidr, normCidr] of before.entries()) {
    if (!after.has(cidr)) {
      changes.push(recordChange('REMOVED', {
        cidr,
        before: normCidr,
        metadataBefore: beforeMetadata?.get(cidr)
      }));
    }
  }

  // Find added CIDRs
  for (const [cidr, normCidr] of after.entries()) {
    if (!before.has(cidr)) {
      changes.push(recordChange('ADDED', {
        cidr,
        after: normCidr,
        metadataAfter: afterMetadata?.get(cidr)
      }));
    }
  }

  // Find modified CIDRs (metadata changes)
  for (const [cidr, normCidr] of after.entries()) {
    if (before.has(cidr)) {
      const beforeMeta = beforeMetadata?.get(cidr);
      const afterMeta = afterMetadata?.get(cidr);
      
      if (hasMetadataChanged(beforeMeta, afterMeta)) {
        changes.push(recordChange('METADATA_CHANGED', {
          cidr,
          before: before.get(cidr),
          after: normCidr,
          metadataBefore: beforeMeta,
          metadataAfter: afterMeta
        }));
      }
    }
  }

  return changes;
}

/**
 * Check if metadata has changed
 */
function hasMetadataChanged(
  before?: Record<string, unknown>,
  after?: Record<string, unknown>
): boolean {
  if (!before && !after) return false;
  if (!before || !after) return true;
  
  const beforeKeys = Object.keys(before).sort();
  const afterKeys = Object.keys(after).sort();
  
  if (beforeKeys.length !== afterKeys.length) return true;
  if (beforeKeys.join(',') !== afterKeys.join(',')) return true;
  
  for (const key of beforeKeys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      return true;
    }
  }
  
  return false;
}

/**
 * Format changes as markdown
 */
export function formatChangesAsMarkdown(changes: Change[]): string {
  if (changes.length === 0) {
    return 'No changes detected.\n';
  }

  let md = `# Design Changes\n\n`;
  md += `**Total Changes:** ${changes.length}\n\n`;

  const added = changes.filter(c => c.type === 'ADDED');
  const removed = changes.filter(c => c.type === 'REMOVED');
  const modified = changes.filter(c => c.type === 'METADATA_CHANGED');

  if (added.length > 0) {
    md += `## ✅ Added (${added.length})\n\n`;
    for (const change of added) {
      md += `- \`${change.cidr}\`\n`;
      if (change.metadataAfter) {
        md += `  - Metadata: ${JSON.stringify(change.metadataAfter)}\n`;
      }
    }
    md += '\n';
  }

  if (removed.length > 0) {
    md += `## ❌ Removed (${removed.length})\n\n`;
    for (const change of removed) {
      md += `- \`${change.cidr}\`\n`;
      if (change.metadataBefore) {
        md += `  - Had metadata: ${JSON.stringify(change.metadataBefore)}\n`;
      }
    }
    md += '\n';
  }

  if (modified.length > 0) {
    md += `## 📝 Metadata Changed (${modified.length})\n\n`;
    for (const change of modified) {
      md += `- \`${change.cidr}\`\n`;
      md += `  - Before: ${JSON.stringify(change.metadataBefore || {})}\n`;
      md += `  - After: ${JSON.stringify(change.metadataAfter || {})}\n`;
    }
    md += '\n';
  }

  return md;
}

/**
 * Get change summary statistics
 */
export function getChangeSummary(changes: Change[]): {
  added: number;
  removed: number;
  modified: number;
  total: number;
} {
  return {
    added: changes.filter(c => c.type === 'ADDED').length,
    removed: changes.filter(c => c.type === 'REMOVED').length,
    modified: changes.filter(c => c.type === 'METADATA_CHANGED').length,
    total: changes.length
  };
}

