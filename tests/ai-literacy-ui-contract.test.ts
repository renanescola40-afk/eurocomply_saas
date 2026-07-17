import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync('src/app/[locale]/dashboard/ai-literacy/page.tsx', 'utf8');
const sidebar = readFileSync('src/components/dashboard/dashboard-workspace-sidebar.tsx', 'utf8');

describe('AI literacy dashboard contract', () => {
  it('is discoverable from the premium dashboard navigation', () => {
    expect(sidebar).toContain("href: `${basePath}/ai-literacy`");
    expect(sidebar).toContain("label: 'AI Literacy'");
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
});
