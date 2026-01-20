/**
 * Tests for string utility functions
 */

import { describe, it, expect } from 'vitest';
import { truncateMiddle, truncateStart } from './string-utils';

describe('truncateMiddle', () => {
  it('should return original string if shorter than maxChars', () => {
    expect(truncateMiddle('hello', 10)).toBe('hello');
    expect(truncateMiddle('test', 4)).toBe('test');
  });

  it('should return original string if equal to maxChars', () => {
    expect(truncateMiddle('hello', 5)).toBe('hello');
  });

  it('should truncate in the middle with ellipsis', () => {
    // '192.168.100.200' (15 chars) -> maxChars=10 -> keep=9 -> left=5, right=4
    expect(truncateMiddle('192.168.100.200', 10)).toBe('192.1….200');
    expect(truncateMiddle('abcdefghij', 7)).toBe('abc…hij');
  });

  it('should handle very short maxChars', () => {
    expect(truncateMiddle('hello', 3)).toBe('hel');
    expect(truncateMiddle('hello', 2)).toBe('he');
    expect(truncateMiddle('hello', 1)).toBe('h');
  });

  it('should handle IPv6 addresses', () => {
    const ipv6 = '2001:db8:abcd:ef01::1234';
    // 24 chars -> maxChars=15 -> keep=14 -> left=7, right=7
    expect(truncateMiddle(ipv6, 15)).toBe('2001:db…1::1234');
  });

  it('should distribute characters evenly', () => {
    // maxChars=7 means keep=6 (7-1 for ellipsis)
    // left=ceil(6/2)=3, right=floor(6/2)=3
    expect(truncateMiddle('abcdefgh', 7)).toBe('abc…fgh');
  });
});

describe('truncateStart', () => {
  it('should return original string if shorter than maxChars', () => {
    expect(truncateStart('hello', 10)).toBe('hello');
    expect(truncateStart('test', 4)).toBe('test');
  });

  it('should return original string if equal to maxChars', () => {
    expect(truncateStart('hello', 5)).toBe('hello');
  });

  it('should truncate at the start with ellipsis', () => {
    expect(truncateStart('192.168.100.200', 10)).toBe('…8.100.200');
    expect(truncateStart('abcdefghij', 7)).toBe('…efghij');
  });

  it('should handle very short maxChars', () => {
    expect(truncateStart('hello', 1)).toBe('…');
    expect(truncateStart('hello', 2)).toBe('…o');
  });

  it('should preserve end of string', () => {
    const path = '/very/long/path/to/file.txt';
    // 28 chars -> maxChars=15 -> keep last 14 chars
    expect(truncateStart(path, 15)).toBe('…th/to/file.txt');
  });
});

