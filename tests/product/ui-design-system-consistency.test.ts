import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
async function source(path: string) { return readFile(resolve(ROOT, path), 'utf8'); }

const canonicalDashboardPages = [
  'src/app/[locale]/dashboard/compliance/page.tsx',
  'src/app/[locale]/dashboard/organizations/activity/page.tsx',
  'src/app/[locale]/dashboard/organizations/clerk/page.tsx',
  'src/app/[locale]/dashboard/organizations/vendors/page.tsx',
  'src/app/[locale]/dashboard/organizations/audit-logs/page.tsx',
];

const canonicalForms = [
  'src/components/vendors/create-vendor-form.tsx',
  'src/components/documents/create-document-form.tsx',
  'src/components/compliance/create-compliance-task-form.tsx',
];

const canonicalStates = [
  'src/app/[locale]/dashboard/organizations/billing/error.tsx',
  'src/app/[locale]/dashboard/organizations/billing/loading.tsx',
  'src/app/[locale]/dashboard/organizations/team/error.tsx',
  'src/app/[locale]/dashboard/organizations/team/loading.tsx',
  'src/app/[locale]/dashboard/organizations/documents/error.tsx',
  'src/app/[locale]/admin/sales/leads/error.tsx',
  'src/app/[locale]/admin/sales/leads/loading.tsx',
];

const finalOperationalSurfaces = [
  'src/app/[locale]/dashboard/privacy/privacy-client.tsx',
  'src/components/billing/upgrade-required-card.tsx',
  'src/components/team/enterprise-access-console.tsx',
  'src/components/ui/enterprise-feedback.tsx',
  'src/app/[locale]/ai-systems/[id]/page.tsx',
  'src/app/[locale]/ai-systems/[id]/ai-system-edit-form.tsx',
  'src/app/[locale]/raci/raci-client.tsx',
  'src/app/[locale]/audit-pack/page.tsx',
  'src/app/[locale]/audit-pack/verify/page.tsx',
  'src/app/[locale]/audit-pack/verify/evidence-pack-verifier.tsx',
  'src/app/[locale]/calendario-compliance/compliance-calendar-client.tsx',
  'src/components/dashboard/enterprise-dashboard-overview.tsx',
];

describe('UI design system consistency closure', () => {
  it('keeps migrated authenticated pages on the canonical dashboard frame', async () => {
    for (const page of canonicalDashboardPages) {
      const content = await source(page);
      expect(content, page).toContain('min-h-0 bg-transparent');
      expect(content, page).not.toContain('min-h-screen bg-[#050505]');
      expect(content, page).not.toContain('rounded-[2rem]');
      expect(content, page).not.toContain('rounded-3xl');
    }
  });

  it('keeps primary operational forms on the shared control geometry and surfaces', async () => {
    for (const form of canonicalForms) {
      const content = await source(form);
      expect(content, form).toContain('rounded-xl');
      expect(content, form).toContain('bg-[#0b121e]');
      expect(content, form).toContain('rounded-lg');
      expect(content, form).not.toContain('bg-white text-black');
    }
  });

  it('keeps critical loading and error states aligned with their parent product surfaces', async () => {
    for (const state of canonicalStates) {
      const content = await source(state);
      expect(content, state).toContain('rounded-xl');
      expect(content, state).not.toContain('rounded-[2rem]');
      expect(content, state).not.toContain('rounded-3xl');
      expect(content, state).not.toContain('shadow-2xl');
    }
  });

  it('keeps final operational surfaces on canonical cards and controls', async () => {
    for (const surface of finalOperationalSurfaces) {
      const content = await source(surface);
      expect(content, surface).toContain('rounded-xl');
      expect(content, surface).toContain('rounded-lg');
      expect(content, surface).not.toContain('rounded-[2rem]');
      expect(content, surface).not.toContain('rounded-[1.75rem]');
      expect(content, surface).not.toContain('rounded-3xl');
      expect(content, surface).not.toContain('enterprise-panel');
      expect(content, surface).not.toContain('hover:bg-blue-500');
    }
  });

  it('keeps auth recovery and entry surfaces on one auth visual system', async () => {
    const authPages = [
      'src/app/[locale]/login/page.tsx',
      'src/app/[locale]/recuperar-senha/page.tsx',
      'src/app/[locale]/atualizar-senha/page.tsx',
      'src/app/[locale]/reset-password/page.tsx',
      'src/app/[locale]/oauth/complete/page.tsx',
      'src/app/[locale]/auth/diagnostics/page.tsx',
    ];
    for (const page of authPages) {
      const content = await source(page);
      expect(content, page).toContain('bg-[#080e18]');
      expect(content, page).toContain('rounded-xl');
      expect(content, page).not.toContain('rounded-[2rem]');
      expect(content, page).not.toContain('rounded-[1.75rem]');
      expect(content, page).not.toContain('rounded-full bg-white');
      expect(content, page).not.toContain('hover:bg-blue-500');
    }
  });

  it('keeps enterprise SSO controls aligned with auth geometry and contrast rules', async () => {
    const content = await source('src/components/auth/enterprise-sso-login.tsx');
    expect(content).toContain('rounded-xl');
    expect(content).toContain('rounded-lg');
    expect(content).toContain('h-10');
    expect(content).not.toContain('rounded-2xl');
    expect(content).not.toContain('hover:bg-blue-500');
  });

  it('routes GDPR privacy to the real self-service controls', async () => {
    const page = await source('src/app/[locale]/dashboard/privacy/page.tsx');
    expect(page).toContain("import { PrivacyAdminClient } from './privacy-client'");
    expect(page).toContain('<PrivacyAdminClient locale={locale} />');
  });

  it('removes simulated/local-only behavior from paid RACI and calendar surfaces', async () => {
    const raci = await source('src/app/[locale]/raci/raci-client.tsx');
    const calendar = await source('src/app/[locale]/calendario-compliance/compliance-calendar-client.tsx');
    expect(raci).toContain('/raci');
    expect(raci).not.toContain('const initialRows');
    expect(calendar).not.toContain('localStorage');
    expect(calendar).not.toContain('setTimeout');
    expect(calendar).not.toContain('simulad');
    expect(calendar).not.toContain('initialObligations');
  });
});
