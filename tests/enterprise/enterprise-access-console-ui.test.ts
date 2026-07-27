import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync(
  'src/app/[locale]/dashboard/organizations/team/page.tsx',
  'utf8',
);
const consoleUi = readFileSync(
  'src/components/team/enterprise-access-console.tsx',
  'utf8',
);
const loading = readFileSync(
  'src/app/[locale]/dashboard/organizations/team/loading.tsx',
  'utf8',
);
const errorBoundary = readFileSync(
  'src/app/[locale]/dashboard/organizations/team/error.tsx',
  'utf8',
);

describe('Enterprise access operations console UI', () => {
  it('integrates the console into the authenticated organization team page', () => {
    expect(page).toContain("import { EnterpriseAccessConsole }");
    expect(page).toContain('<EnterpriseAccessConsole />');
    expect(page).toContain('getCurrentOrganizationForUser(user.id)');
    expect(page).toContain('redirect(`/${locale}/onboarding`)');
    expect(page).toContain("export const fetchCache = 'force-no-store'");
  });

  it('loads tenant-scoped runtime and seat contention APIs without accepting organization ids', () => {
    expect(consoleUi).toContain("fetch('/api/team/access-runtime?limit=25'");
    expect(consoleUi).toContain("fetch('/api/team/seat-contention'");
    expect(consoleUi).toContain("cache: 'no-store'");
    expect(consoleUi).not.toContain('organizationId:');
    expect(consoleUi).not.toContain('organization_id:');
  });

  it('requires step-up for alert lifecycle and evidence export mutations', () => {
    expect(consoleUi).toContain('STEP_UP_TOKEN_HEADER');
    expect(consoleUi).toContain('<StepUpMfaDialog');
    expect(consoleUi).toContain('action="manage_team"');
    expect(consoleUi).toContain("operation: 'export'");
    expect(consoleUi).toContain("action: 'acknowledge'");
    expect(consoleUi).toContain("action: 'resolve'");
    expect(consoleUi).toContain('reason: mutation.reason');
  });

  it('renders SLO, dead-letter, contention and integrity evidence', () => {
    expect(consoleUi).toContain('Success rate');
    expect(consoleUi).toContain('p95 duration');
    expect(consoleUi).toContain('Oldest pending');
    expect(consoleUi).toContain('Dead letters');
    expect(consoleUi).toContain('Seat contention');
    expect(consoleUi).toContain('SHA-256');
    expect(consoleUi).toContain('job.sha256.slice(0, 12)');
  });

  it('provides accessible loading, error, empty and refresh states', () => {
    expect(loading).toContain('aria-busy="true"');
    expect(errorBoundary).toContain('role="alert"');
    expect(errorBoundary).toContain('Retry safely');
    expect(consoleUi).toContain('role="status"');
    expect(consoleUi).toContain('No active access-runtime alerts.');
    expect(consoleUi).toContain('No export jobs yet.');
    expect(consoleUi).toContain("setRefreshing(true)");
  });

  it('does not expose unsigned provider downloads or raw storage URLs', () => {
    expect(consoleUi).not.toContain('storage_path');
    expect(consoleUi).not.toContain('provider_url');
    expect(consoleUi).not.toContain('signedUrl');
    expect(consoleUi).not.toContain('window.open');
  });
});
