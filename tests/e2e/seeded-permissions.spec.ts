import { expect, test, type Page } from '@playwright/test';

type Persona = 'owner' | 'admin' | 'member' | 'viewer';

type PersonaConfig = {
  storageStateEnv: string;
  canManageBilling: boolean;
  canManageTeam: boolean;
  canWriteProductData: boolean;
};

const PERSONAS: Record<Persona, PersonaConfig> = {
  owner: {
    storageStateEnv: 'E2E_OWNER_STORAGE_STATE',
    canManageBilling: true,
    canManageTeam: true,
    canWriteProductData: true,
  },
  admin: {
    storageStateEnv: 'E2E_ADMIN_STORAGE_STATE',
    canManageBilling: false,
    canManageTeam: true,
    canWriteProductData: true,
  },
  member: {
    storageStateEnv: 'E2E_MEMBER_STORAGE_STATE',
    canManageBilling: false,
    canManageTeam: false,
    canWriteProductData: false,
  },
  viewer: {
    storageStateEnv: 'E2E_VIEWER_STORAGE_STATE',
    canManageBilling: false,
    canManageTeam: false,
    canWriteProductData: false,
  },
};

const protectedRoutes = [
  '/en/dashboard/organizations',
  '/en/dashboard/organizations/team',
  '/en/dashboard/organizations/billing',
  '/en/dashboard/organizations/documents',
  '/en/dashboard/organizations/risks',
  '/en/vendor-assurance',
  '/en/ai-systems',
  '/en/aprovacoes',
  '/en/auditoria',
  '/en/settings',
] as const;

async function expectHealthyAuthenticatedPage(page: Page, label: string) {
  await expect(page.locator('body'), `${label} body should render`).toBeVisible();
  await expect(page.locator('body'), `${label} should not expose runtime errors`).not.toContainText(
    /Unhandled Runtime Error|Application error|ReferenceError:|TypeError:|SyntaxError:|Stack trace/i,
  );
  const pathname = new URL(page.url()).pathname;
  expect(pathname, `${label} should remain in the authenticated application`).toMatch(
    /^\/en\/(?:dashboard|ai-systems|vendor-assurance|aprovacoes|auditoria|settings)(?:\/|$)/,
  );
  expect(pathname, `${label} should not be a public or authentication page`).not.toMatch(
    /\/(?:login|signup|pricing|checkout)(?:\/|$)/,
  );
  // EnterpriseDashboardShell and nested feature pages each render a main element.
  // Assert the outermost rendered application area, without Playwright strict-mode collisions.
  await expect(page.locator('main').first(), `${label} must render the application main area`).toBeVisible();
  expect(page.url(), `${label} should never navigate to /undefined`).not.toContain('/undefined');
}

const seededPermissionsEnabled = process.env.E2E_ENABLE_SEEDED_PERSONA_PERMISSIONS === 'true';

// A missing or cross-environment fixture must be a failed opt-in QA run, not 40+ skipped green tests.
if (seededPermissionsEnabled) {
  const missing = (['E2E_OWNER_STORAGE_STATE', 'E2E_ADMIN_STORAGE_STATE', 'E2E_MEMBER_STORAGE_STATE'] as const)
    .filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) throw new Error(`qat02_missing_required_qa_persona_states:${missing.join(',')}`);

  const qaApp = process.env.E2E_BASE_URL;
  const qaData = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const approvedRef = process.env.E2E_QA_APPROVED_SUPABASE_REF;
  let app: URL;
  let database: URL;
  try {
    app = new URL(qaApp ?? '');
    database = new URL(qaData ?? '');
  } catch {
    throw new Error('qat02_requires_exact_isolated_qa_origins');
  }
  if (
    app.protocol !== 'https:' ||
    app.host !== 'eurocomply-saas-env-qa-renanescola40-afks-projects.vercel.app' ||
    app.pathname !== '/' || app.search || app.hash ||
    database.origin !== 'https://zrxrrfbllsxtleyxjpsz.supabase.co' ||
    database.pathname !== '/' || database.search || database.hash ||
    approvedRef !== 'zrxrrfbllsxtleyxjpsz'
  ) {
    throw new Error('qat02_requires_exact_isolated_qa_origins');
  }
}

test.describe('seeded persona permission smoke', () => {
  test.skip(
    !seededPermissionsEnabled,
    'Enable only for exact isolated QA with owner/admin/member synthetic storageState files.',
  );

  for (const [persona, config] of Object.entries(PERSONAS) as [Persona, PersonaConfig][]) {
    test.describe(`${persona} seeded persona`, () => {
      test.skip(persona === 'viewer' && !process.env[config.storageStateEnv], 'Viewer fixture is optional.');
      test.use({ storageState: process.env[config.storageStateEnv] || undefined });

      for (const route of protectedRoutes) {
        test(`${persona} can load ${route} without redirect or runtime error`, async ({ page }) => {
          await page.goto(route, { waitUntil: 'domcontentloaded' });
          await expectHealthyAuthenticatedPage(page, `${persona} ${route}`);
        });
      }

      test(`${persona} sees the expected billing permission surface`, async ({ page }) => {
        await page.goto('/en/dashboard/organizations/billing', { waitUntil: 'domcontentloaded' });
        await expectHealthyAuthenticatedPage(page, `${persona} billing permission surface`);

        const readOnly = page.getByText(/billing is read-only for your role/i);
        if (config.canManageBilling) {
          await expect(readOnly).toHaveCount(0);
          await expect(page.getByRole('heading', { name: /manage your RISCK COMPLY plan/i })).toBeVisible();
        } else {
          await expect(readOnly).toBeVisible();
          await expect(page.getByRole('button', { name: /owner access required/i })).toBeDisabled();
          await expect(page.getByRole('button', { name: /owner action required/i }).first()).toBeDisabled();
        }
      });

      test(`${persona} sees the expected team permission surface`, async ({ page }) => {
        await page.goto('/en/dashboard/organizations/team', { waitUntil: 'domcontentloaded' });
        await expectHealthyAuthenticatedPage(page, `${persona} team permission surface`);

        const restricted = page.getByText(/team access is restricted/i);
        if (config.canManageTeam) {
          await expect(restricted).toHaveCount(0);
          await expect(page.getByText(/pending invites/i).first()).toBeVisible();
        } else {
          await expect(restricted).toBeVisible();
          await expect(page.getByRole('button', { name: /send invitation/i })).toHaveCount(0);
        }
      });

      test(`${persona} sees the expected product write permission surface`, async ({ page }) => {
        await page.goto('/en/ai-systems', { waitUntil: 'domcontentloaded' });
        await expectHealthyAuthenticatedPage(page, `${persona} product write permission surface`);

        const readonly = page.getByText(/your role can review AI systems, risk classification and governance readiness/i);
        if (config.canWriteProductData) {
          await expect(readonly).toHaveCount(0);
          await expect(page.getByRole('button', { name: /classify and save/i })).toBeVisible();
        } else {
          await expect(readonly).toBeVisible();
          await expect(page.getByRole('button', { name: /classify and save/i })).toHaveCount(0);
        }
      });
    });
  }
});
