#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const files = {
  root: 'src/app/page.tsx',
  localeHome: 'src/app/[locale]/page.tsx',
  middleware: 'src/middleware.ts',
  orgDashboardLayout: 'src/app/[locale]/dashboard/organizations/layout.tsx',
  orgDashboardAccess: 'src/server/queries/organization-dashboard-access.ts',
  orgDashboard: 'src/app/[locale]/dashboard/organizations/page.tsx',
  dashboardHomeOverview: 'src/components/dashboard/dashboard-home-overview.tsx',
  nextBestActions: 'src/components/dashboard/next-best-actions.tsx',
  orgDashboardQuery: 'src/server/queries/organization-dashboard.ts',
  currentOrganization: 'src/server/queries/current-organization.ts',
};

const expectations = [
  [files.root, ['redirect', "'/pt'"]],
  [files.localeHome, ['force-static', 'revalidate = 300', 'EnterpriseHome']],
  [files.middleware, ['shouldCheckMarketingHomeAuth', 'ORGANIZATION_DASHBOARD_PATH', 'withPrivateNoStore']],
  [
    files.orgDashboardLayout,
    [
      'getOrganizationDashboardRedirect(safeLocale)',
      "await import('next/navigation')",
      'navigation.redirect(redirectTarget)',
      'DashboardCommandNavigation',
    ],
  ],
  [
    files.orgDashboardAccess,
    [
      'getCurrentUser',
      'getCurrentOrganizationForUser(user.id)',
      'getOrganizationBillingAuthority(currentOrganization.id)',
      'if (!authority.licensed)',
      'if (!currentOrganization.is_onboarding_completed)',
      'encodeURIComponent',
      '`/${locale}/onboarding`',
    ],
  ],
  [
    files.orgDashboard,
    [
      'getCurrentUser',
      'getLoginPath(safeLocale, dashboardPath)',
      'encodeURIComponent(nextPath)',
      'getOrganizationDashboardData',
      'workflowReadiness={data.workflowReadiness}',
    ],
  ],
  [files.dashboardHomeOverview, ['OrganizationWorkflowReadiness', 'workflowReadiness', 'NextBestActions']],
  [files.nextBestActions, ['OrganizationWorkflowReadiness', 'buildWorkflowReadinessAction', 'workflowReadiness', 'current workflow readiness']],
  [
    files.orgDashboardQuery,
    [
      'getCurrentOrganizationForUser',
      'organization.id',
      "eq('organization_id', organizationId)",
      "from('compliance_tasks')",
      "from('risks')",
      "from('vendors')",
      "from('documents')",
      'OrganizationWorkflowReadiness',
      'getOrganizationWorkflowReadiness',
      'workflowReadiness',
      'risk-review-required',
      'open-compliance-work',
      'vendor-review-required',
      'evidence-review-required',
      'ready-for-executive-review',
    ],
  ],
  [
    files.currentOrganization,
    [
      "from('organization_members')",
      'onboarding_status',
      'onboarding_completed_at',
      'is_onboarding_completed',
      'isOrganizationOnboardingCompleted',
      'getCurrentOrganizationForUser',
      'membership.slug === slug',
    ],
  ],
];

const failures = [];

for (const [file, required] of expectations) {
  if (!existsSync(file)) {
    failures.push(`${file} is missing`);
    continue;
  }

  const content = readFileSync(file, 'utf8');
  for (const phrase of required) {
    if (!content.includes(phrase)) {
      failures.push(`${file} is missing required invariant: ${phrase}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Phase 5 dashboard invariant check failed.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Phase 5 dashboard invariant check passed.');