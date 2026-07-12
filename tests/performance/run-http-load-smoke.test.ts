import { describe, expect, it } from 'vitest';

import {
  isAllowedTarget,
  normalizedPaths,
  parseAllowedHosts,
  percentile,
  resolveSameOriginTarget,
} from '../../scripts/performance/run-http-load-smoke.mjs';

describe('safe HTTP load smoke helpers', () => {
  it('allows localhost without remote-load opt-in', () => {
    expect(isAllowedTarget('http://127.0.0.1:3000')).toBe(true);
    expect(isAllowedTarget('http://localhost:3000')).toBe(true);
  });

  it('rejects arbitrary remote hosts by default', () => {
    expect(isAllowedTarget('https://example.com')).toBe(false);
  });

  it('allows only explicitly allowlisted remote hosts with opt-in', () => {
    const allowedHosts = parseAllowedHosts('staging.example.com, preview.example.com');
    expect(isAllowedTarget('https://staging.example.com', { allowedHosts, allowRemote: true })).toBe(true);
    expect(isAllowedTarget('https://evil.example.com', { allowedHosts, allowRemote: true })).toBe(false);
  });

  it('rejects network-path, backslash and control-character paths', () => {
    expect(() => normalizedPaths('//evil.example/path')).toThrow(/unsafe or off-origin/i);
    expect(() => normalizedPaths('/\\evil.example/path')).toThrow(/unsafe or off-origin/i);
    expect(() => normalizedPaths('/safe\nunsafe')).toThrow(/unsafe or off-origin/i);
  });

  it('verifies every resolved path stays on the configured origin', () => {
    expect(resolveSameOriginTarget('https://staging.example.com', '/api/health').origin).toBe(
      'https://staging.example.com',
    );
    expect(() => resolveSameOriginTarget('https://staging.example.com', '//evil.example/path')).toThrow(
      /outside.*origin/i,
    );
  });

  it('calculates deterministic percentiles', () => {
    expect(percentile([10, 20, 30, 40, 50], 50)).toBe(30);
    expect(percentile([10, 20, 30, 40, 50], 95)).toBe(50);
    expect(percentile([], 95)).toBeNull();
  });
});
