import { describe, expect, it } from 'vitest';

import { isAllowedTarget, parseAllowedHosts, percentile } from './run-http-load-smoke.mjs';

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

  it('calculates deterministic percentiles', () => {
    expect(percentile([10, 20, 30, 40, 50], 50)).toBe(30);
    expect(percentile([10, 20, 30, 40, 50], 95)).toBe(50);
    expect(percentile([], 95)).toBeNull();
  });
});
