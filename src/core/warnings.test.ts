import { describe, it, expect } from 'vitest';
import { parseCidr } from './parser';
import { checkEdgeCases, formatWarnings, hasErrors, hasWarnings } from './warnings';

describe('Edge Case Warnings (FR-092)', () => {
  describe('IPv4 warnings', () => {
    it('should warn on /32 host route', () => {
      const cidr = parseCidr('192.168.1.1/32');
      const warnings = checkEdgeCases(cidr);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]!.code).toBe('IPV4_HOST_ROUTE');
      expect(warnings[0]!.level).toBe('INFO');
      expect(warnings[0]!.message).toContain('/32');
    });

    it('should warn on /31 RFC 3021', () => {
      const cidr = parseCidr('10.0.0.0/31');
      const warnings = checkEdgeCases(cidr);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]!.code).toBe('IPV4_RFC3021');
      expect(warnings[0]!.level).toBe('WARNING');
      expect(warnings[0]!.message).toContain('RFC 3021');
    });

    it('should warn on /30 very small subnet', () => {
      const cidr = parseCidr('172.16.0.0/30');
      const warnings = checkEdgeCases(cidr);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]!.code).toBe('IPV4_VERY_SMALL');
      expect(warnings[0]!.level).toBe('INFO');
    });

    it('should warn on 0.0.0.0/0 default route', () => {
      const cidr = parseCidr('0.0.0.0/0');
      const warnings = checkEdgeCases(cidr);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]!.code).toBe('IPV4_DEFAULT_ROUTE');
      expect(warnings[0]!.level).toBe('WARNING');
    });

    it('should not warn on normal /24', () => {
      const cidr = parseCidr('192.168.0.0/24');
      const warnings = checkEdgeCases(cidr);
      
      expect(warnings).toHaveLength(0);
    });
  });

  describe('IPv6 warnings', () => {
    it('should warn on /128 host route', () => {
      const cidr = parseCidr('2001:db8::1/128');
      const warnings = checkEdgeCases(cidr);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]!.code).toBe('IPV6_HOST_ROUTE');
      expect(warnings[0]!.level).toBe('INFO');
    });

    it('should warn on /127 RFC 6164', () => {
      const cidr = parseCidr('2001:db8::/127');
      const warnings = checkEdgeCases(cidr);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]!.code).toBe('IPV6_RFC6164');
      expect(warnings[0]!.level).toBe('INFO');
      expect(warnings[0]!.message).toContain('RFC 6164');
    });

    it('should warn on ::/0 default route', () => {
      const cidr = parseCidr('::/0');
      const warnings = checkEdgeCases(cidr);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]!.code).toBe('IPV6_DEFAULT_ROUTE');
      expect(warnings[0]!.level).toBe('WARNING');
    });

    it('should warn on very large allocation', () => {
      const cidr = parseCidr('2001:db8::/32');
      const warnings = checkEdgeCases(cidr);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]!.code).toBe('IPV6_LARGE_ALLOCATION');
      expect(warnings[0]!.level).toBe('INFO');
    });

    it('should warn on subnet smaller than /64', () => {
      const cidr = parseCidr('2001:db8::/80');
      const warnings = checkEdgeCases(cidr);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]!.code).toBe('IPV6_SUBNET_TOO_SMALL');
      expect(warnings[0]!.level).toBe('WARNING');
      expect(warnings[0]!.message).toContain('RFC 4291');
    });

    it('should not warn on normal /64', () => {
      const cidr = parseCidr('2001:db8::/64');
      const warnings = checkEdgeCases(cidr);
      
      expect(warnings).toHaveLength(0);
    });

    it('should not warn on /48 site allocation', () => {
      const cidr = parseCidr('2001:db8::/48');
      const warnings = checkEdgeCases(cidr);
      
      expect(warnings).toHaveLength(0);
    });
  });

  describe('formatWarnings', () => {
    it('should format warnings with emojis', () => {
      const cidr = parseCidr('10.0.0.0/31');
      const warnings = checkEdgeCases(cidr);
      const formatted = formatWarnings(warnings);
      
      expect(formatted).toContain('⚠️');
      expect(formatted).toContain('[IPV4_RFC3021]');
      expect(formatted).toContain('💡');
    });

    it('should return "No warnings" for empty array', () => {
      const formatted = formatWarnings([]);
      expect(formatted).toBe('No warnings');
    });
  });

  describe('hasErrors and hasWarnings', () => {
    it('should detect warnings', () => {
      const cidr = parseCidr('10.0.0.0/31');
      const warnings = checkEdgeCases(cidr);
      
      expect(hasWarnings(warnings)).toBe(true);
      expect(hasErrors(warnings)).toBe(false);
    });

    it('should return false for info-only', () => {
      const cidr = parseCidr('192.168.1.1/32');
      const warnings = checkEdgeCases(cidr);
      
      expect(hasWarnings(warnings)).toBe(false);
      expect(hasErrors(warnings)).toBe(false);
    });

    it('should return false for no warnings', () => {
      const cidr = parseCidr('192.168.0.0/24');
      const warnings = checkEdgeCases(cidr);
      
      expect(hasWarnings(warnings)).toBe(false);
      expect(hasErrors(warnings)).toBe(false);
    });
  });
});

