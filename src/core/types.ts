/**
 * Core domain types for subnet calculator
 * Implements FR-001 to FR-006 (Input & Normalisation)
 */

export type IpVersion = 4 | 6;

export type NormalisedCidr = {
  version: IpVersion;
  bits: 32 | 128;
  network: bigint;
  prefix: number;
};

export type SubnetMeta = {
  version: IpVersion;
  bits: 32 | 128;
  cidr: string;

  network: string;
  prefix: number;
  netmask: string;
  wildcard: string;

  /** IPv4 only. For IPv6 this will be undefined (IPv6 has no broadcast address). */
  broadcast?: string;

  /** The last address in the CIDR block (broadcast for IPv4). */
  lastAddress: string;

  addressCount: bigint;
  usableCount: bigint;

  /** Range of addresses considered "usable" by this calculator.
   *  - IPv4: /32 => 1, /31 => 2 (RFC 3021), otherwise excludes network + broadcast.
   *  - IPv6: all addresses are considered usable.
   */
  firstUsable: string | null;
  lastUsable: string | null;
};

/**
 * Special address range classifications (FR-006)
 */
export enum AddressClass {
  PRIVATE = 'PRIVATE',
  LOOPBACK = 'LOOPBACK',
  LINK_LOCAL = 'LINK_LOCAL',
  MULTICAST = 'MULTICAST',
  DOCUMENTATION = 'DOCUMENTATION',
  RESERVED = 'RESERVED',
  UNIQUE_LOCAL = 'UNIQUE_LOCAL', // IPv6 ULA
  GLOBAL_UNICAST = 'GLOBAL_UNICAST',
  UNSPECIFIED = 'UNSPECIFIED',
  BROADCAST = 'BROADCAST', // IPv4 only
  PUBLIC = 'PUBLIC',
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Overlap detection result (FR-032)
 */
export type OverlapResult = {
  hasOverlap: boolean;
  overlaps: Array<{
    a: NormalisedCidr;
    b: NormalisedCidr;
    type: 'IDENTICAL' | 'A_CONTAINS_B' | 'B_CONTAINS_A' | 'PARTIAL';
  }>;
};

/**
 * VLSM allocation request (FR-040 to FR-045)
 */
export type VlsmRequest = {
  name: string;
  requiredHosts?: number;
  requiredPrefix?: number;
  metadata?: Record<string, unknown>;
};

export type VlsmAllocation = {
  name: string;
  cidr: NormalisedCidr;
  metadata?: Record<string, unknown>;
  allocated: boolean;
};

export type VlsmStrategy =
  | 'LARGEST_FIRST'
  | 'SMALLEST_FIRST'
  | 'PACKED_LOW'
  | 'PACKED_HIGH'
  | 'BALANCED';

/**
 * Design change tracking (FR-080)
 */
export type DesignChange = {
  timestamp: Date;
  operation: string;
  before?: unknown;
  after?: unknown;
  notes?: string;
};

/**
 * Subnet tree node for visual designer (FR-050 to FR-057)
 */
export type SubnetNode = {
  id: string;
  version: IpVersion;
  bits: 32 | 128;
  network: bigint;
  prefix: number;
  path: string;
  metadata?: Record<string, unknown>;
  status?: 'VALID' | 'INVALID' | 'RESERVED' | 'DEPRECATED';
  children?: [SubnetNode, SubnetNode];
  collapsed?: boolean;
};

/**
 * Export format types (FR-070 to FR-073)
 */
export type ExportFormat = 'JSON' | 'CSV' | 'MARKDOWN' | 'TERRAFORM' | 'ANSIBLE';

/**
 * Design model for import/export (FR-071, FR-072)
 */
export type DesignModel = {
  version: string;
  created: Date;
  modified: Date;
  root: SubnetNode;
  metadata?: Record<string, unknown>;
  changes?: DesignChange[];
};

