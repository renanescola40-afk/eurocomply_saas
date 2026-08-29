import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const FRIA_LAYOUT = new URL('../../src/app/[locale]/dashboard/fria/layout.tsx', import.meta.url);
const FRIA_CSS = new URL('../../src/app/[locale]/dashboard/fria/fria-ui-v2.module.css', import.meta.url);
const FRIA_PAGE = new URL('../../src/app/[locale]/dashboard/fria/page.tsx', import.meta.url);
const BILLING_LAYOUT = new URL('../../src/app/[locale]/dashboard/organizations/billing/layout.tsx', import.meta.url);
const BILLING_CSS = new URL('../../src/app/[locale]/dashboard/organizations/billing/billing-ui-v2.module.css', import.meta.url);
const BILLING_VIEW = new URL('../../src/app/[locale]/dashboard/organizations/billing/billing-page-view.tsx', import.meta.url);

describe('RISCK COMPLY UI V2 FRIA and billing shells', () => {
  it('changes FRIA chrome without changing its governed workflow contracts', async () => {
    const [layout, css, page] = await Promise.all([
      readFile(FRIA_LAYOUT, 'utf8'),
      readFile(FRIA_CSS, 'utf8'),
      readFile(FRIA_PAGE, 'utf8'),
    ]);

    expect(layout).toContain('data-risck-fria-shell="risck-ui-v2"');
    expect(layout).toContain("import styles from './fria-ui-v2.module.css'");
    expect(css).toContain('background: #0d1522');
    expect(css).toContain('background: rgb(37 99 235)');
    expect(page).toContain("roleHasPermission(snapshot?.role, 'manage_ai_governance')");
    expect(page).toContain("fetch('/api/ai-governance/fria'");
    expect(page).toContain('/api/ai-governance/fria/assignees?assessment_id=');
    expect(page).toContain('workflow=${encodeURIComponent(workflow)}');
  });

  it('changes billing chrome without changing checkout, portal or sales-led behavior', async () => {
    const [layout, css, view] = await Promise.all([
      readFile(BILLING_LAYOUT, 'utf8'),
      readFile(BILLING_CSS, 'utf8'),
      readFile(BILLING_VIEW, 'utf8'),
    ]);

    expect(layout).toContain('data-risck-billing-shell="risck-ui-v2"');
    expect(layout).toContain("import styles from './billing-ui-v2.module.css'");
    expect(css).toContain('background: #0d1522');
    expect(css).toContain('background: rgb(37 99 235)');
    expect(view).toContain('action="portal"');
    expect(view).toContain('action="checkout"');
    expect(view).toContain("intent=sales&plan=${plan.id}");
    expect(view).toContain('canManageBilling');
  });
});
