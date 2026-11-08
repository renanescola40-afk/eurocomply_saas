import { expect, test } from '@playwright/test';

// SEC-02 provider-backed denial: separate from source-only RBAC unit assertions.
// Opt-in exclusively against isolated QA; a skipped test is NOT acceptance proof.
const enabled = process.env.E2E_SEC02_NEGATIVE_API === 'true';
const qaRef = 'zrxrrfbllsxtleyxjpsz';
const baseUrl = process.env.E2E_BASE_URL;

if (enabled) {
  if (process.env.E2E_ALLOW_SYNTHETIC_APP_WRITES !== 'true') {
    throw new Error('sec02_negative_api_requires_synthetic_write_qa_preflight');
  }
  if (process.env.E2E_QA_APPROVED_SUPABASE_REF !== qaRef ||
      process.env.NEXT_PUBLIC_SUPABASE_URL !== `https://${qaRef}.supabase.co`) {
    throw new Error('sec02_negative_api_requires_exact_approved_qa_database');
  }
  let target: URL;
  try {
    target = new URL(baseUrl ?? '');
  } catch {
    throw new Error('sec02_negative_api_requires_explicit_qa_app_origin');
  }
  if (target.protocol !== 'https:' || !target.hostname ||
      target.hostname === 'risckcomply.com' ||
      target.hostname.endsWith('.risckcomply.com') ||
      target.hostname.includes('git-main') ||
      target.username || target.password || target.port || target.search || target.hash) {
    throw new Error('sec02_negative_api_refuses_production_or_untrusted_origin');
  }
}

test.describe('SEC-02 QA member privileged mutation denial', () => {
  test.skip(!enabled, 'Requires explicit SEC-02 QA opt-in; skipped != verified.');
  test.skip(!process.env.E2E_MEMBER_STORAGE_STATE, 'Requires an authenticated QA member session.');

  test.use({ storageState: process.env.E2E_MEMBER_STORAGE_STATE || undefined });

  test('active member cannot remove another member through privileged API', async ({ page }) => {
    // Deliberately nonexistent UUID: an accidentally permitted request cannot
    // remove a real QA member. Authentication must be valid; 401 is NOT PASS.
    const response = await page.request.post('/api/team/members/remove', {
      headers: { origin: new URL(baseUrl!).origin },
      data: { memberId: '00000000-0000-4000-8000-000000000000' },
    });

    expect(response.status()).toBe(403);
    expect(response.headers()['cache-control']).toContain('no-store');
    const body = await response.json();
    expect(body.error).toBe('permission_denied');
  });
});
