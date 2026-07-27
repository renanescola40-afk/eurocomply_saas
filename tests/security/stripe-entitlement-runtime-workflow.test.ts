import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/stripe-entitlement-runtime.yml', 'utf8');

function expectPinnedActions() {
  const uses = [...workflow.matchAll(/uses:\s+([^\s]+)/g)].map((match) => match[1]);
  expect(uses.length).toBeGreaterThan(0);
  for (const action of uses) expect(action).toMatch(/@[0-9a-f]{40}$/);
}

describe('Stripe entitlement runtime workflow', () => {
  it('checks out and validates the exact assessed SHA', () => {
    expect(workflow).toContain('TARGET_SHA');
    expect(workflow).toContain('git rev-parse HEAD');
  });

  it('runs runtime and governance contracts', () => {
    expect(workflow).toContain('stripe-entitlement-runtime.test.ts');
    expect(workflow).toContain('stripe-entitlement-runtime-workflow.test.ts');
  });

  it('uploads retained evidence with least privilege', () => {
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('retention-days: 90');
    expectPinnedActions();
  });
});
