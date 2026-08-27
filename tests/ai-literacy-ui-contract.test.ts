import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync('src/app/[locale]/dashboard/ai-literacy/page.tsx', 'utf8');
const shell = readFileSync('src/components/dashboard/enterprise-dashboard-shell.tsx', 'utf8');

describe('AI literacy dashboard contract', () => {
  it('is discoverable from the canonical enterprise dashboard navigation', () => {
    expect(shell).toContain("href: localized(locale, '/dashboard/ai-literacy')");
    expect(shell).toContain('aiLiteracy');
    expect(page).toContain("fetch('/api/ai-literacy'");
  });

  it('uses organization-backed APIs instead of local-only storage', () => {
    expect(page).not.toContain('localStorage');
    expect(page).not.toContain('sessionStorage');
    expect(page).toContain("fetch(`/api/ai-literacy?workflow=${encodeURIComponent(workflow)}`");
  });

  it('exposes the complete operational lifecycle', () => {
    for (const workflow of [
      'program_create',
      'program_activate',
      'course_create',
      'course_publish',
      'assignment_create',
      'assignment_complete',
      'evidence_submit',
      'evidence_review',
    ]) {
      expect(page).toContain(`'${workflow}'`);
    }
  });

  it('keeps the legal boundary visible to users', () => {
    expect(page).toContain('not a certificate or legal-compliance guarantee');
    expect(page).toContain('Não é certificado nem garantia de conformidade jurídica');
  });

  it('uses the shared graphite enterprise canvas without legacy dashboard chrome', () => {
    expect(page).toContain('<main className="min-h-0 bg-transparent text-white">');
    expect(page).toContain('rounded-xl border border-white/[0.075] bg-[#101715]');
    expect(page).not.toContain('min-h-screen bg-[#05070b]');
    expect(page).not.toContain('rounded-[2rem]');
    expect(page).not.toContain('violet-');
    expect(page).not.toContain("from '@/components/ui/card'");
  });
});
