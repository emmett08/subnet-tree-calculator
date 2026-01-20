/**
 * VLSM (Variable Length Subnet Masking) planning (FR-040 to FR-045)
 */

import type { NormalisedCidr, VlsmRequest, VlsmAllocation, VlsmStrategy } from './types';
import { splitByHostCount, splitIntoN } from './transformations';
import { containsPrefix } from './set-operations';

/**
 * Allocate VLSM subnets under a parent prefix (FR-040, FR-041)
 */
export function allocateVlsm(
  parent: NormalisedCidr,
  requests: VlsmRequest[],
  strategy: VlsmStrategy = 'LARGEST_FIRST',
  reserved: NormalisedCidr[] = []
): VlsmAllocation[] {
  // Validate reserved blocks are within parent
  for (const res of reserved) {
    if (!containsPrefix(parent, res)) {
      throw new Error('Reserved block is not within parent prefix');
    }
  }

  // Sort requests based on strategy
  const sortedRequests = sortRequestsByStrategy([...requests], strategy, parent.version);

  const allocations: VlsmAllocation[] = [];
  const allocated: NormalisedCidr[] = [...reserved];

  for (const req of sortedRequests) {
    const allocation = allocateOne(parent, req, allocated, parent.version);
    
    if (allocation) {
      allocations.push({
        name: req.name,
        cidr: allocation,
        metadata: req.metadata,
        allocated: true,
      });
      allocated.push(allocation);
    } else {
      allocations.push({
        name: req.name,
        cidr: parent, // Placeholder
        metadata: req.metadata,
        allocated: false,
      });
    }
  }

  return allocations;
}

function sortRequestsByStrategy(
  requests: VlsmRequest[],
  strategy: VlsmStrategy,
  version: 4 | 6
): VlsmRequest[] {
  const getSize = (req: VlsmRequest): number => {
    if (req.requiredPrefix != null) {
      return req.requiredPrefix;
    }
    if (req.requiredHosts != null) {
      // Calculate prefix needed for hosts
      let hostBits: number;
      if (version === 4) {
        if (req.requiredHosts === 1) {
          hostBits = 0;
        } else if (req.requiredHosts === 2) {
          hostBits = 1;
        } else {
          hostBits = Math.ceil(Math.log2(req.requiredHosts + 2));
        }
      } else {
        hostBits = Math.ceil(Math.log2(req.requiredHosts));
      }
      return (version === 4 ? 32 : 128) - hostBits;
    }
    return 0;
  };

  switch (strategy) {
    case 'LARGEST_FIRST':
      return requests.sort((a, b) => getSize(a) - getSize(b));
    case 'SMALLEST_FIRST':
      return requests.sort((a, b) => getSize(b) - getSize(a));
    case 'PACKED_LOW':
    case 'PACKED_HIGH':
    case 'BALANCED':
      // For these strategies, sort largest first (most efficient packing)
      return requests.sort((a, b) => getSize(a) - getSize(b));
    default:
      return requests;
  }
}

function allocateOne(
  parent: NormalisedCidr,
  request: VlsmRequest,
  allocated: NormalisedCidr[],
  version: 4 | 6
): NormalisedCidr | null {
  // Determine required prefix
  let requiredPrefix: number;

  if (request.requiredPrefix != null) {
    requiredPrefix = request.requiredPrefix;
  } else if (request.requiredHosts != null) {
    let hostBits: number;
    if (version === 4) {
      if (request.requiredHosts === 1) {
        hostBits = 0;
      } else if (request.requiredHosts === 2) {
        hostBits = 1;
      } else {
        hostBits = Math.ceil(Math.log2(request.requiredHosts + 2));
      }
    } else {
      hostBits = Math.ceil(Math.log2(request.requiredHosts));
    }
    requiredPrefix = parent.bits - hostBits;
  } else {
    throw new Error('Request must specify either requiredHosts or requiredPrefix');
  }

  if (requiredPrefix < parent.prefix) {
    return null; // Cannot allocate larger than parent
  }

  // Generate candidate subnets
  const prefixDiff = requiredPrefix - parent.prefix;
  const numCandidates = 1 << prefixDiff;
  const candidates = splitIntoN(parent, numCandidates);

  // Find first available candidate
  for (const candidate of candidates) {
    const conflicts = allocated.some(
      (alloc) =>
        containsPrefix(candidate, alloc) ||
        containsPrefix(alloc, candidate) ||
        candidate.network === alloc.network
    );

    if (!conflicts) {
      return candidate;
    }
  }

  return null; // No space available
}

/**
 * Policy constraint for VLSM allocation (FR-045)
 */
export type VlsmPolicy = {
  minPrefix?: number;
  maxPrefix?: number;
  allowedPrefixes?: number[];
  forbiddenRanges?: NormalisedCidr[];
  requireAlignment?: boolean;
};

/**
 * Validate allocation against policy (FR-045)
 */
export function validateAllocationPolicy(
  allocation: NormalisedCidr,
  policy: VlsmPolicy
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (policy.minPrefix != null && allocation.prefix < policy.minPrefix) {
    errors.push(`Prefix /${allocation.prefix} is smaller than minimum /${policy.minPrefix}`);
  }

  if (policy.maxPrefix != null && allocation.prefix > policy.maxPrefix) {
    errors.push(`Prefix /${allocation.prefix} is larger than maximum /${policy.maxPrefix}`);
  }

  if (policy.allowedPrefixes && !policy.allowedPrefixes.includes(allocation.prefix)) {
    errors.push(`Prefix /${allocation.prefix} is not in allowed list: ${policy.allowedPrefixes.join(', ')}`);
  }

  if (policy.forbiddenRanges) {
    for (const forbidden of policy.forbiddenRanges) {
      if (containsPrefix(forbidden, allocation) || containsPrefix(allocation, forbidden)) {
        errors.push(`Allocation overlaps with forbidden range`);
        break;
      }
    }
  }

  if (policy.requireAlignment) {
    // Check if network address is aligned to subnet size
    const size = 1n << BigInt(allocation.bits - allocation.prefix);
    if (allocation.network % size !== 0n) {
      errors.push(`Network address is not aligned to subnet size`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Allocate with policy enforcement (FR-045)
 */
export function allocateVlsmWithPolicy(
  parent: NormalisedCidr,
  requests: VlsmRequest[],
  policy: VlsmPolicy,
  strategy: VlsmStrategy = 'LARGEST_FIRST',
  reserved: NormalisedCidr[] = []
): VlsmAllocation[] {
  const allocations = allocateVlsm(parent, requests, strategy, reserved);

  // Validate each allocation against policy
  for (const alloc of allocations) {
    if (alloc.allocated) {
      const validation = validateAllocationPolicy(alloc.cidr, policy);
      if (!validation.valid) {
        // Mark as not allocated if policy violation
        alloc.allocated = false;
        alloc.metadata = {
          ...alloc.metadata,
          policyErrors: validation.errors,
        };
      }
    }
  }

  return allocations;
}

/**
 * Calculate VLSM utilization statistics (FR-044)
 */
export function calculateUtilization(
  parent: NormalisedCidr,
  allocations: VlsmAllocation[]
): {
  totalSpace: bigint;
  allocatedSpace: bigint;
  freeSpace: bigint;
  utilizationPercent: number;
  fragmentationScore: number;
} {
  const totalSpace = 1n << BigInt(parent.bits - parent.prefix);

  let allocatedSpace = 0n;
  for (const alloc of allocations) {
    if (alloc.allocated) {
      allocatedSpace += 1n << BigInt(alloc.cidr.bits - alloc.cidr.prefix);
    }
  }

  const freeSpace = totalSpace - allocatedSpace;
  const utilizationPercent = Number((allocatedSpace * 10000n) / totalSpace) / 100;

  // Simple fragmentation score: number of allocated blocks / ideal number
  const fragmentationScore = allocations.filter((a) => a.allocated).length;

  return {
    totalSpace,
    allocatedSpace,
    freeSpace,
    utilizationPercent,
    fragmentationScore,
  };
}

