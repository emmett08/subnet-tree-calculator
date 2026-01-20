/**
 * Tests for vlsm.ts (FR-040 to FR-045)
 * Covers VLSM allocation with different strategies, reserved blocks, metadata
 */

import { describe, it, expect } from 'vitest';
import { allocateVlsm } from './vlsm';
import { parseCidr } from './parser';
import type { VlsmRequest } from './types';

describe('VLSM allocation (FR-040, FR-041)', () => {
  it('should allocate subnets by host count', () => {
    const parent = parseCidr('192.168.0.0/24');
    const requests: VlsmRequest[] = [
      { name: 'LAN1', requiredHosts: 50 },
      { name: 'LAN2', requiredHosts: 25 },
      { name: 'LAN3', requiredHosts: 10 },
    ];

    const allocations = allocateVlsm(parent, requests, 'LARGEST_FIRST');

    expect(allocations).toHaveLength(3);
    expect(allocations.every((a) => a.allocated)).toBe(true);
  });

  it('should allocate subnets by prefix length', () => {
    const parent = parseCidr('192.168.0.0/24');
    const requests: VlsmRequest[] = [
      { name: 'Subnet1', requiredPrefix: 26 },
      { name: 'Subnet2', requiredPrefix: 27 },
    ];

    const allocations = allocateVlsm(parent, requests, 'LARGEST_FIRST');

    expect(allocations).toHaveLength(2);
    expect(allocations[0]!.allocated).toBe(true);
    expect(allocations[0]!.cidr.prefix).toBe(26);
  });

  it('should handle metadata (FR-043)', () => {
    const parent = parseCidr('192.168.0.0/24');
    const requests: VlsmRequest[] = [
      {
        name: 'DMZ',
        requiredHosts: 30,
        metadata: { vlan: 100, description: 'DMZ network' },
      },
    ];

    const allocations = allocateVlsm(parent, requests);

    expect(allocations[0]!.metadata).toEqual({ vlan: 100, description: 'DMZ network' });
  });

  it('should respect reserved blocks (FR-042)', () => {
    const parent = parseCidr('192.168.0.0/24');
    const reserved = [parseCidr('192.168.0.0/26')];
    const requests: VlsmRequest[] = [
      { name: 'LAN1', requiredPrefix: 26 },
    ];

    const allocations = allocateVlsm(parent, requests, 'LARGEST_FIRST', reserved);

    expect(allocations[0]!.allocated).toBe(true);
    // Should allocate 192.168.0.64/26 (next available)
    expect(allocations[0]!.cidr.network).not.toBe(reserved[0]!.network);
  });

  it('should mark allocation as failed when no space (FR-044)', () => {
    const parent = parseCidr('192.168.0.0/30');
    const requests: VlsmRequest[] = [
      { name: 'TooLarge', requiredHosts: 100 },
    ];

    const allocations = allocateVlsm(parent, requests);

    expect(allocations[0]!.allocated).toBe(false);
  });

  it('should handle LARGEST_FIRST strategy (FR-041)', () => {
    const parent = parseCidr('192.168.0.0/24');
    const requests: VlsmRequest[] = [
      { name: 'Small', requiredHosts: 10 },
      { name: 'Large', requiredHosts: 100 },
      { name: 'Medium', requiredHosts: 50 },
    ];

    const allocations = allocateVlsm(parent, requests, 'LARGEST_FIRST');

    // Should allocate in order: Large, Medium, Small
    expect(allocations.every((a) => a.allocated)).toBe(true);
  });

  it('should handle SMALLEST_FIRST strategy (FR-041)', () => {
    const parent = parseCidr('192.168.0.0/24');
    const requests: VlsmRequest[] = [
      { name: 'Large', requiredHosts: 100 },
      { name: 'Small', requiredHosts: 10 },
    ];

    const allocations = allocateVlsm(parent, requests, 'SMALLEST_FIRST');

    expect(allocations.every((a) => a.allocated)).toBe(true);
  });

  it('should reject reserved blocks outside parent', () => {
    const parent = parseCidr('192.168.0.0/24');
    const reserved = [parseCidr('192.168.1.0/24')];
    const requests: VlsmRequest[] = [
      { name: 'LAN1', requiredHosts: 10 },
    ];

    expect(() => allocateVlsm(parent, requests, 'LARGEST_FIRST', reserved)).toThrow(
      'Reserved block is not within parent'
    );
  });

  it('should handle IPv6 VLSM allocation', () => {
    const parent = parseCidr('2001:db8::/48');
    const requests: VlsmRequest[] = [
      { name: 'Subnet1', requiredHosts: 1000 },
      { name: 'Subnet2', requiredHosts: 500 },
    ];

    const allocations = allocateVlsm(parent, requests, 'LARGEST_FIRST');

    expect(allocations).toHaveLength(2);
    expect(allocations.every((a) => a.allocated)).toBe(true);
  });

  it('should handle edge case: 1 host IPv4 (/32)', () => {
    const parent = parseCidr('192.168.0.0/24');
    const requests: VlsmRequest[] = [
      { name: 'Host', requiredHosts: 1 },
    ];

    const allocations = allocateVlsm(parent, requests);

    expect(allocations[0]!.allocated).toBe(true);
    expect(allocations[0]!.cidr.prefix).toBe(32);
  });

  it('should handle edge case: 2 hosts IPv4 (/31 RFC 3021)', () => {
    const parent = parseCidr('192.168.0.0/24');
    const requests: VlsmRequest[] = [
      { name: 'P2P', requiredHosts: 2 },
    ];

    const allocations = allocateVlsm(parent, requests);

    expect(allocations[0]!.allocated).toBe(true);
    expect(allocations[0]!.cidr.prefix).toBe(31);
  });

  it('should reject request without requiredHosts or requiredPrefix', () => {
    const parent = parseCidr('192.168.0.0/24');
    const requests: VlsmRequest[] = [
      { name: 'Invalid' },
    ];

    expect(() => allocateVlsm(parent, requests)).toThrow(
      'must specify either requiredHosts or requiredPrefix'
    );
  });
});

