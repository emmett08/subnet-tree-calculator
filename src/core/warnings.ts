/**
 * Edge case warnings and safety guidance (FR-092)
 */

import type { IpVersion, NormalisedCidr } from './types';

export type WarningLevel = 'INFO' | 'WARNING' | 'ERROR';

export type SubnetWarning = {
  level: WarningLevel;
  code: string;
  message: string;
  suggestion?: string;
};

/**
 * Check for edge cases and generate warnings (FR-092)
 */
export function checkEdgeCases(cidr: NormalisedCidr): SubnetWarning[] {
  const warnings: SubnetWarning[] = [];

  if (cidr.version === 4) {
    // /32 - single host
    if (cidr.prefix === 32) {
      warnings.push({
        level: 'INFO',
        code: 'IPV4_HOST_ROUTE',
        message: 'This is a /32 host route (single IP address)',
        suggestion: 'Host routes are typically used for loopback or specific routing entries'
      });
    }

    // /31 - RFC 3021 point-to-point
    if (cidr.prefix === 31) {
      warnings.push({
        level: 'WARNING',
        code: 'IPV4_RFC3021',
        message: 'This is a /31 point-to-point link (RFC 3021)',
        suggestion: 'Both addresses are usable. Not all devices support RFC 3021. Consider /30 for compatibility.'
      });
    }

    // /0 - entire IPv4 space
    if (cidr.prefix === 0) {
      warnings.push({
        level: 'WARNING',
        code: 'IPV4_DEFAULT_ROUTE',
        message: 'This is the entire IPv4 address space (0.0.0.0/0)',
        suggestion: 'Typically used only for default routes'
      });
    }

    // Very small subnets that might be mistakes (but not /31 which has its own warning)
    if (cidr.prefix === 30) {
      warnings.push({
        level: 'INFO',
        code: 'IPV4_VERY_SMALL',
        message: `Very small subnet (/${cidr.prefix}) with limited usable addresses`,
        suggestion: 'A /30 provides 2 usable addresses (typically for point-to-point links)'
      });
    }
  } else {
    // IPv6 warnings
    
    // /128 - single host
    if (cidr.prefix === 128) {
      warnings.push({
        level: 'INFO',
        code: 'IPV6_HOST_ROUTE',
        message: 'This is a /128 host route (single IPv6 address)',
        suggestion: 'Host routes are typically used for loopback or specific routing entries'
      });
    }

    // /127 - RFC 6164 point-to-point
    if (cidr.prefix === 127) {
      warnings.push({
        level: 'INFO',
        code: 'IPV6_RFC6164',
        message: 'This is a /127 point-to-point link (RFC 6164)',
        suggestion: 'Recommended for point-to-point links to avoid Neighbor Discovery issues'
      });
    }

    // /0 - entire IPv6 space
    if (cidr.prefix === 0) {
      warnings.push({
        level: 'WARNING',
        code: 'IPV6_DEFAULT_ROUTE',
        message: 'This is the entire IPv6 address space (::/0)',
        suggestion: 'Typically used only for default routes'
      });
    }

    // Unusual prefix lengths
    if (cidr.prefix < 48 && cidr.prefix > 0) {
      warnings.push({
        level: 'INFO',
        code: 'IPV6_LARGE_ALLOCATION',
        message: `Very large IPv6 allocation (/${cidr.prefix})`,
        suggestion: 'Typical allocations: /48 for sites, /56 for small sites, /64 for subnets'
      });
    }

    if (cidr.prefix > 64 && cidr.prefix < 127) {
      warnings.push({
        level: 'WARNING',
        code: 'IPV6_SUBNET_TOO_SMALL',
        message: `IPv6 subnet smaller than /64 (/${cidr.prefix}). RFC 4291 recommends /64 for all subnets.`,
        suggestion: 'Smaller subnets may cause issues with SLAAC and other IPv6 features.'
      });
    }
  }

  return warnings;
}

/**
 * Get a human-readable summary of warnings
 */
export function formatWarnings(warnings: SubnetWarning[]): string {
  if (warnings.length === 0) {
    return 'No warnings';
  }

  return warnings
    .map(w => {
      const prefix = w.level === 'ERROR' ? '❌' : w.level === 'WARNING' ? '⚠️' : 'ℹ️';
      let msg = `${prefix} [${w.code}] ${w.message}`;
      if (w.suggestion) {
        msg += `\n   💡 ${w.suggestion}`;
      }
      return msg;
    })
    .join('\n\n');
}

/**
 * Check if warnings contain any errors
 */
export function hasErrors(warnings: SubnetWarning[]): boolean {
  return warnings.some(w => w.level === 'ERROR');
}

/**
 * Check if warnings contain any warnings (not just info)
 */
export function hasWarnings(warnings: SubnetWarning[]): boolean {
  return warnings.some(w => w.level === 'WARNING' || w.level === 'ERROR');
}

