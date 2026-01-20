/**
 * SubnetService - Facade over domain capabilities (FR-074)
 * Provides a unified API for all subnet operations
 */

import type { NormalisedCidr, IpVersion, VlsmRequest, VlsmAllocation, VlsmStrategy } from './types';
import { parseCidr, formatCidr, formatAddress, parseCidrWithNetmask, rangeToMinimalPrefixes, classifyAddress } from './parser';
import { subnetMeta, binaryWithPrefix, reverseDnsZone, formatCount } from './calculations';
import { splitBinary, splitIntoN, splitByHostCount, mergeSiblings, summarizePrefixes, minimalCoveringSupernet } from './transformations';
import { containsIp, containsPrefix, detectOverlaps, areAdjacent, unionPrefixes, intersectPrefixes, differencePrefixes } from './set-operations';
import { allocateVlsm } from './vlsm';

/**
 * Unified subnet service facade
 */
export class SubnetService {
  /**
   * Parse CIDR notation (FR-001, FR-002)
   */
  parse(input: string): NormalisedCidr {
    return parseCidr(input);
  }

  /**
   * Parse CIDR with netmask notation (FR-004)
   */
  parseWithNetmask(address: string, netmask: string): NormalisedCidr {
    return parseCidrWithNetmask(address, netmask);
  }

  /**
   * Format CIDR to string (FR-001, FR-002)
   */
  format(cidr: NormalisedCidr): string {
    return formatCidr(cidr.version, cidr.network, cidr.prefix);
  }

  /**
   * Convert IP range to minimal prefixes (FR-003)
   */
  rangeToMinimalPrefixes(start: string, end: string): NormalisedCidr[] {
    return rangeToMinimalPrefixes(start, end);
  }

  /**
   * Classify address (FR-006)
   */
  classifyAddress(address: string) {
    return classifyAddress(address);
  }

  /**
   * Get subnet metadata (FR-010, FR-011)
   */
  getMetadata(network: bigint, prefix: number, version: IpVersion, bits: 32 | 128) {
    return subnetMeta(network, prefix, version, bits);
  }

  /**
   * Get binary representation (FR-013)
   */
  getBinary(network: bigint, prefix: number, bits: 32 | 128): string {
    return binaryWithPrefix(network, prefix, bits);
  }

  /**
   * Get reverse DNS zone (FR-012)
   */
  getReverseDns(network: bigint, prefix: number, version: IpVersion, bits: 32 | 128): string {
    return reverseDnsZone(network, prefix, version, bits);
  }

  /**
   * Format count (FR-010, FR-011)
   */
  formatCount(count: bigint, bits: 32 | 128, prefix: number): string {
    return formatCount(count, bits, prefix);
  }

  /**
   * Split prefix into two equal subnets (FR-020)
   */
  splitBinary(cidr: NormalisedCidr): [NormalisedCidr, NormalisedCidr] {
    return splitBinary(cidr);
  }

  /**
   * Split into N equal subnets (FR-021)
   */
  splitIntoN(cidr: NormalisedCidr, n: number): NormalisedCidr[] {
    return splitIntoN(cidr, n);
  }

  /**
   * Split by required host count (FR-022)
   */
  splitByHostCount(cidr: NormalisedCidr, hostCount: number): { prefix: number; subnets: NormalisedCidr[] } {
    return splitByHostCount(cidr, hostCount);
  }

  /**
   * Merge sibling prefixes (FR-023)
   */
  mergeSiblings(left: NormalisedCidr, right: NormalisedCidr): NormalisedCidr {
    return mergeSiblings(left, right);
  }

  /**
   * Summarise prefixes (FR-024)
   */
  summarise(cidrs: NormalisedCidr[]): NormalisedCidr[] {
    return summarizePrefixes(cidrs);
  }

  /**
   * Get minimal covering supernet (FR-025)
   */
  getMinimalCoveringSupernet(cidrs: NormalisedCidr[]): NormalisedCidr {
    return minimalCoveringSupernet(cidrs);
  }

  /**
   * Check if CIDR contains IP (FR-030)
   */
  containsIp(cidr: NormalisedCidr, ip: string): boolean {
    return containsIp(cidr, ip);
  }

  /**
   * Check if CIDR contains another CIDR (FR-031)
   */
  containsPrefix(parent: NormalisedCidr, child: NormalisedCidr): boolean {
    return containsPrefix(parent, child);
  }

  /**
   * Detect overlaps (FR-032)
   */
  detectOverlaps(cidrs: NormalisedCidr[]) {
    return detectOverlaps(cidrs);
  }

  /**
   * Check if prefixes are adjacent (FR-033)
   */
  areAdjacent(a: NormalisedCidr, b: NormalisedCidr): boolean {
    return areAdjacent(a, b);
  }

  /**
   * Compute union (FR-034)
   */
  union(a: NormalisedCidr[], b: NormalisedCidr[]): NormalisedCidr[] {
    return unionPrefixes(a, b);
  }

  /**
   * Compute intersection (FR-034)
   */
  intersection(a: NormalisedCidr, b: NormalisedCidr): NormalisedCidr | null {
    return intersectPrefixes(a, b);
  }

  /**
   * Compute difference (FR-034)
   */
  difference(a: NormalisedCidr, b: NormalisedCidr): NormalisedCidr[] {
    return differencePrefixes(a, b);
  }

  /**
   * Allocate VLSM subnets (FR-040 to FR-045)
   */
  allocateVlsm(
    parent: NormalisedCidr,
    requests: VlsmRequest[],
    strategy: VlsmStrategy = 'LARGEST_FIRST',
    reserved: NormalisedCidr[] = []
  ): VlsmAllocation[] {
    return allocateVlsm(parent, requests, strategy, reserved);
  }

  /**
   * Longest prefix match lookup (FR-061)
   */
  longestPrefixMatch(ip: string, cidrs: NormalisedCidr[]): NormalisedCidr | null {
    let bestMatch: NormalisedCidr | null = null;
    let bestPrefix = -1;

    for (const cidr of cidrs) {
      if (containsIp(cidr, ip) && cidr.prefix > bestPrefix) {
        bestMatch = cidr;
        bestPrefix = cidr.prefix;
      }
    }

    return bestMatch;
  }
}

