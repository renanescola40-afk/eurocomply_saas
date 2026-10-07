import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Phase 1 manifest brand credibility guard', () => {
  it('keeps the installable app manifest aligned to RISCK COMPLY and AI compliance', () => {
    const manifest = readFileSync('src/app/manifest.ts', 'utf8');

    expect(manifest).toContain("name: 'RISCK COMPLY'");
    expect(manifest).toContain("short_name: 'RISCK COMPLY'");
    expect(manifest).toContain('AI compliance operating system for EU AI Act readiness');
    expect(manifest).not.toContain('European compliance operating system for regulated B2B teams');
    expect(manifest).not.toContain('EuroComply');
  });
});
