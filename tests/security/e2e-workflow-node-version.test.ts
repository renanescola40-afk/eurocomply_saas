import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type PackageManifest = {
  engines: { node: string };
};

describe('manual Playwright E2E runner engine contract', () => {
  it('uses a Node major version allowed by the application package engine', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as PackageManifest;
    const workflow = readFileSync('.github/workflows/e2e.yml', 'utf8');

    const minimumMajor = Number(pkg.engines.node.match(/>=\s*(\d+)/)?.[1]);
    const exclusiveMaximumMajor = Number(pkg.engines.node.match(/<\s*(\d+)/)?.[1]);
    const nodeVersionMatches = [...workflow.matchAll(/^\s+node-version:\s*['"]?(\d+)['"]?\s*$/gm)];

    expect(Number.isInteger(minimumMajor)).toBe(true);
    expect(Number.isInteger(exclusiveMaximumMajor)).toBe(true);
    expect(nodeVersionMatches, 'Manual E2E must declare one setup-node runtime').toHaveLength(1);

    const configuredMajor = Number(nodeVersionMatches[0][1]);
    expect(configuredMajor).toBeGreaterThanOrEqual(minimumMajor);
    expect(configuredMajor).toBeLessThan(exclusiveMaximumMajor);
  });
});
