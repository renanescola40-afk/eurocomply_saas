import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const OBSERVABILITY = new URL('../../src/app/[locale]/dashboard/observability/page.tsx', import.meta.url);
const AUDIT_PACK = new URL('../../src/app/[locale]/dashboard/audit-pack/page.tsx', import.meta.url);

describe('RISCK UI V2 operations surfaces', () => {
  it('uses cobalt for observability actions and operations chrome', async () => {
    const source = await readFile(OBSERVABILITY, 'utf8');

    expect(source).toContain('RISCK COMPLY Ops');
    expect(source).toContain('text-blue-200/60');
    expect(source).toContain('bg-blue-600');
    expect(source).toContain('focus-visible:ring-blue-400/40');
    expect(source).toContain('rounded-xl border border-white/[0.075] bg-[#0d1522]');
    expect(source).toContain('text-amber-300');
    expect(source).not.toContain('bg-emerald-300 px-4');
  });

  it('uses cobalt for audit-pack actions while keeping semantic readiness colors', async () => {
    const source = await readFile(AUDIT_PACK, 'utf8');

    expect(source).toContain('border-blue-300/15 bg-blue-300/[0.08] text-blue-200');
    expect(source).toContain('bg-blue-600 text-white hover:bg-blue-500');
    expect(source).toContain('rounded-xl border-white/[0.075] bg-[#0d1522]');
    expect(source).toContain('tone="emerald"');
    expect(source).toContain('border-emerald-300/15 bg-emerald-300/[0.07] text-emerald-200');
    expect(source).toContain("amber: 'text-amber-300'");
    expect(source).toContain("red: 'text-red-300'");
  });
});
