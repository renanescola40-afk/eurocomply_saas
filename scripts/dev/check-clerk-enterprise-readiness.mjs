import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'src/app/[locale]/layout.tsx',
  'src/middleware.ts',
  'src/hooks/useAuth.tsx',
  'src/components/auth/ClerkFloatingControls.tsx',
  'src/components/auth/ClerkOrganizationPanel.tsx',
  'src/app/[locale]/dashboard/organizations/clerk/page.tsx',
  'src/app/api/clerk/organizations/sync/route.ts',
  'src/server/clerk/organization-sync.ts',
  'src/server/security/rbac.ts',
  'supabase/migrations/20260625193000_clerk_organization_identity_mapping.sql',
  'supabase/migrations/20260625214500_clerk_rls_identity_helpers.sql',
  'docs/security/API_ROUTE_INVENTORY.md',
  'scripts/security/check-authorization-bola.mjs',
];

const requiredMarkers = [
  ['src/app/[locale]/layout.tsx', 'ClerkProvider'],
  ['src/middleware.ts', 'clerkMiddleware'],
  ['src/components/auth/ClerkOrganizationPanel.tsx', 'OrganizationSwitcher'],
  ['src/components/auth/ClerkOrganizationPanel.tsx', 'CreateOrganization'],
  ['src/app/api/clerk/organizations/sync/route.ts', 'syncClerkOrganizationToSupabase'],
  ['src/server/clerk/organization-sync.ts', 'clerkOrgId'],
  ['src/server/clerk/organization-sync.ts', 'clerkUserId'],
  ['src/server/security/rbac.ts', 'clerk_user_id'],
  ['supabase/migrations/20260625193000_clerk_organization_identity_mapping.sql', 'clerk_org_id'],
  ['supabase/migrations/20260625193000_clerk_organization_identity_mapping.sql', 'clerk_user_id'],
  ['supabase/migrations/20260625214500_clerk_rls_identity_helpers.sql', 'current_clerk_user_id'],
  ['docs/security/API_ROUTE_INVENTORY.md', 'src/app/api/clerk/organizations/sync/route.ts'],
  ['scripts/security/check-authorization-bola.mjs', 'src/app/api/clerk/organizations/sync/route.ts'],
];

const failures = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    failures.push(`${file}: missing`);
  }
}

for (const [file, marker] of requiredMarkers) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) continue;
  const source = fs.readFileSync(absolute, 'utf8');
  if (!source.includes(marker)) {
    failures.push(`${file}: missing marker ${marker}`);
  }
}

console.log('Clerk enterprise readiness check');
console.log('--------------------------------');

if (failures.length > 0) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Clerk enterprise readiness: ok');
}
