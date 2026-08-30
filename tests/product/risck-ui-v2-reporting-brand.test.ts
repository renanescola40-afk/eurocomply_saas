import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const BOARD_REPORT = new URL('../../src/components/dashboard/board-report-center.tsx', import.meta.url);
const REPORT_PREVIEW = new URL('../../src/components/dashboard/white-label-report-preview.tsx', import.meta.url);

describe('RISCK UI V2 reporting brand contract', () => {
  it('uses cobalt for reporting actions while keeping semantic report states', async () => {
    const source = await readFile(BOARD_REPORT, 'utf8');

    expect(source).toContain('rounded-xl border border-white/[0.075] bg-[#0d1522]');
    expect(source).toContain('text-blue-200/65');
    expect(source).toContain('bg-blue-600');
    expect(source).toContain('focus-visible:ring-blue-400/60');
    expect(source).toContain('border-emerald-300/15 bg-emerald-300/[0.055]');
    expect(source).toContain('border-amber-300/15 bg-amber-300/[0.055]');
    expect(source).toContain('border-rose-300/15 bg-rose-300/[0.055]');
    expect(source).not.toContain('focus-visible:ring-emerald');
    expect(source).not.toContain('bg-[#101715]');
  });

  it('uses the official RISCK COMPLY wordmark and removes the standalone RC monogram', async () => {
    const source = await readFile(REPORT_PREVIEW, 'utf8');

    expect(source).toContain("import Image from 'next/image'");
    expect(source).toContain('src="/brand/risck-comply-wordmark.svg"');
    expect(source).toContain('alt="RISCK COMPLY"');
    expect(source).toContain('rounded-xl border border-white/[0.075] bg-[#0d1522]');
    expect(source).toContain('text-blue-200/65');
    expect(source).toContain('bg-blue-600');
    expect(source).toContain("return 'text-emerald-700'");
    expect(source).not.toContain('>RC</div>');
    expect(source).not.toContain('focus-visible:ring-emerald');
    expect(source).not.toContain('bg-[#101715]');
  });
});
