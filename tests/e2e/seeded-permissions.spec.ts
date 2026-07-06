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
    canManageBilling: true,
    canManageTeam: true,
    canWriteProductData: true,
  },
  member: {
    storageStateEnv: 'E2E_MEMBER_STORAGE_STATE',
    canManageBilling: false,
    canManageTeam: false,
    canWriteProductData: true,
  },
  viewer: {
    storageStateEnv: 'E2E_VIEWER_STORAGE_STATE',
    canManageBilling: false,
    canManageTeam: false,
    canWriteProductData: false,
  },
};

const protectedRoutes = [
  '/pt/dashboard/organizations',
  '/pt/dashboard/organizations/team',
  '/pt/dashboard/organizations/billing',
  '/pt/dashboard/organizations/documents',
  '/pt/dashboard/organizations/risks',
  '/pt/vendor-assurance',
  '/pt/ai-systems',
  '/pt/aprovacoes',
  '/pt/auditoria',
  '/pt/settings',
] as const;

async function expectHealthyAuthenticatedPage(page: Page, label: string) {
  await expect(page.locator('body'), `${label} body should render`).toBeVisible();
  await expect(page.locator('body'), `${label} should not expose runtime errors`).not.toContainText(
    /Unhandled Runtime Error|Application error|ReferenceError:|TypeError:|SyntaxError:|Stack trace/i,
  );
  expect(page.url(), `${label} should not fall back to login`).not.toMatch(/\/pt\/login\?next=/);
  expect(page.url(), `${label} should never navigate to /undefined`).not.toContain('/undefined');
}

async function countVisibleControls(page: Page, pattern: RegExp) {
  return page.getByRole('button', { name: pattern }).or(page.getByRole('link', { name: pattern })).count();
}

test.describe('seeded persona permission smoke', () => {
  test.skip(
    process.env.E2E_ENABLE_SEEDED_PERSONA_PERMISSIONS !== 'true',
    'Enable only in disposable QA environments with synthetic owner/admin/member/viewer storageState files.',
  );

  for (const [persona, config] of Object.entries(PERSONAS) as [Persona, PersonaConfig][]) {
    test.describe(`${persona} seeded persona`, () => {
      test.skip(!process.env[config.storageStateEnv], `Missing ${config.storageStateEnv} for ${persona} persona.`);
      test.use({ storageState: process.env[config.storageStateEnv] || undefined });

      for (const route of protectedRoutes) {
        test(`${persona} can load ${route} without redirect or runtime error`, async ({ page }) => {
          await page.goto(route, { waitUntil: 'domcontentloaded' });
          await expectHealthyAuthenticatedPage(page, `${persona} ${route}`);
        });
      }

      test(`${persona} sees the expected billing permission surface`, async ({ page }) => {
        await page.goto('/pt/dashboard/organizations/billing', { waitUntil: 'domcontentloaded' });
        await expectHealthyAuthenticatedPage(page, `${persona} billing permission surface`);

        const billingControls = await countVisibleControls(page, /billing|checkout|portal|manage subscription|secure checkout|upgrade|manage billing/i);
        if (config.canManageBilling) {
          expect(billingControls, `${persona} should expose at least one billing-management control`).toBeGreaterThan(0);
        } else {
          expect(billingControls, `${persona} should not expose billing-management controls`).toBe(0);
        }
      });

      test(`${persona} sees the expected team permission surface`, async ({ page }) => {
        await page.goto('/pt/dashboard/organizations/team', { waitUntil: 'domcontentloaded' });
        await expectHealthyAuthenticatedPage(page, `${persona} team permission surface`);

        const teamControls = await countVisibleControls(page, /invite|add member|remove|change role|role|admin|owner/i);
        if (config.canManageTeam) {
          expect(teamControls, `${persona} should expose team-management controls`).toBeGreaterThan(0);
        } else {
          expect(teamControls, `${persona} should not expose team-management controls`).toBe(0);
        }
      });

      test(`${persona} sees the expected product write permission surface`, async ({ page }) => {
        await page.goto('/pt/ai-systems', { waitUntil: 'domcontentloaded' });
        await expectHealthyAuthenticatedPage(page, `${persona} product write permission surface`);

        const writeControls = await countVisibleControls(page, /create|new|add|novo|criar|save|guardar|submit|enviar/i);
        if (config.canWriteProductData) {
          expect(writeControls, `${persona} should expose product write controls`).toBeGreaterThan(0);
        } else {
          expect(writeControls, `${persona} should not expose product write controls`).toBe(0);
        }
      });
    });
  }
});
