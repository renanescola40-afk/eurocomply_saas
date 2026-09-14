import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routeSource = () => readFileSync('src/app/api/prelaunch/route.ts', 'utf8');

describe('Beagle waitlist validation response minimization', () => {
  it('returns a generic validation error without disclosing required field names', () => {
    const source = routeSource();

    expect(source).toContain("return noStoreJson({ error: 'Invalid request.' }, { status: 400 });");
    expect(source).not.toContain('Please provide company name, work email, role and consent to contact.');
  });
});
