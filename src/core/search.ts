/**
 * Search and filter functionality (FR-060, FR-062, FR-063)
 */

import type { IpVersion, NormalisedCidr } from './types';
import { containsPrefix } from './set-operations';

export type FilterCriteria = {
  version?: IpVersion;
  minPrefix?: number;
  maxPrefix?: number;
  status?: 'VALID' | 'INVALID' | 'RESERVED' | 'DEPRECATED';
  metadata?: Record<string, unknown>;
};

/**
 * Search subnets by metadata (FR-060)
 */
export function searchByMetadata(
  subnets: Array<{ cidr: NormalisedCidr; metadata?: Record<string, unknown> }>,
  query: string
): Array<{ cidr: NormalisedCidr; metadata?: Record<string, unknown> }> {
  const lowerQuery = query.toLowerCase();
  
  return subnets.filter(subnet => {
    if (!subnet.metadata) return false;
    
    // Search in metadata values
    for (const [key, value] of Object.entries(subnet.metadata)) {
      const keyMatch = key.toLowerCase().includes(lowerQuery);
      const valueMatch = String(value).toLowerCase().includes(lowerQuery);
      
      if (keyMatch || valueMatch) {
        return true;
      }
    }
    
    return false;
  });
}

/**
 * Filter subnets by criteria (FR-063)
 */
export function filterSubnets(
  subnets: Array<{ cidr: NormalisedCidr; metadata?: Record<string, unknown>; status?: string }>,
  criteria: FilterCriteria
): Array<{ cidr: NormalisedCidr; metadata?: Record<string, unknown>; status?: string }> {
  return subnets.filter(subnet => {
    // Filter by IP version
    if (criteria.version !== undefined && subnet.cidr.version !== criteria.version) {
      return false;
    }
    
    // Filter by prefix size
    if (criteria.minPrefix !== undefined && subnet.cidr.prefix < criteria.minPrefix) {
      return false;
    }
    if (criteria.maxPrefix !== undefined && subnet.cidr.prefix > criteria.maxPrefix) {
      return false;
    }
    
    // Filter by status
    if (criteria.status !== undefined && subnet.status !== criteria.status) {
      return false;
    }
    
    // Filter by metadata
    if (criteria.metadata !== undefined) {
      if (!subnet.metadata) return false;
      
      for (const [key, value] of Object.entries(criteria.metadata)) {
        if (subnet.metadata[key] !== value) {
          return false;
        }
      }
    }
    
    return true;
  });
}

/**
 * Navigate parent/child lineage (FR-062)
 */
export function getParentPrefixes(cidr: NormalisedCidr): NormalisedCidr[] {
  const parents: NormalisedCidr[] = [];
  
  // Generate all parent prefixes from current up to /0
  for (let prefix = cidr.prefix - 1; prefix >= 0; prefix--) {
    const mask = (1n << BigInt(cidr.bits - prefix)) - 1n;
    const parentNetwork = cidr.network & ~mask;
    
    parents.push({
      version: cidr.version,
      bits: cidr.bits,
      network: parentNetwork,
      prefix
    });
  }
  
  return parents;
}

/**
 * Get immediate parent prefix
 */
export function getParent(cidr: NormalisedCidr): NormalisedCidr | null {
  if (cidr.prefix === 0) return null;
  
  const prefix = cidr.prefix - 1;
  const mask = (1n << BigInt(cidr.bits - prefix)) - 1n;
  const parentNetwork = cidr.network & ~mask;
  
  return {
    version: cidr.version,
    bits: cidr.bits,
    network: parentNetwork,
    prefix
  };
}

/**
 * Get child prefixes (binary split)
 */
export function getChildren(cidr: NormalisedCidr): [NormalisedCidr, NormalisedCidr] | null {
  if (cidr.prefix >= cidr.bits) return null;
  
  const childPrefix = cidr.prefix + 1;
  const halfSize = 1n << BigInt(cidr.bits - childPrefix);
  
  const left: NormalisedCidr = {
    version: cidr.version,
    bits: cidr.bits,
    network: cidr.network,
    prefix: childPrefix
  };
  
  const right: NormalisedCidr = {
    version: cidr.version,
    bits: cidr.bits,
    network: cidr.network + halfSize,
    prefix: childPrefix
  };
  
  return [left, right];
}

/**
 * Find all descendants of a prefix in a set
 */
export function findDescendants(
  parent: NormalisedCidr,
  candidates: NormalisedCidr[]
): NormalisedCidr[] {
  return candidates.filter(candidate => {
    // A descendant must be contained by parent and have a longer prefix
    return candidate.prefix > parent.prefix && containsPrefix(parent, candidate);
  });
}

/**
 * Find all ancestors of a prefix in a set
 */
export function findAncestors(
  child: NormalisedCidr,
  candidates: NormalisedCidr[]
): NormalisedCidr[] {
  return candidates.filter(candidate => {
    // An ancestor must contain the child and have a shorter prefix
    return candidate.prefix < child.prefix && containsPrefix(candidate, child);
  });
}

