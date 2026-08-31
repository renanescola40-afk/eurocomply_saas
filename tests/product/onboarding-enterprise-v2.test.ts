import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const RUNTIME = new URL('../../src/components/onboarding/onboarding-runtime-boundary.tsx', import.meta.url);
const STYLES = new URL('../../src/components/onboarding/onboarding-enterprise-v2.module.css', import.meta.url);

describe('RISCK COMPLY UI V2 onboarding shell', () => {
  it('wraps the licensed onboarding runtime in the shared enterprise visual contract without changing activation authority', async () => {
    const source = await readFile(RUNTIME, 'utf8');

    expect(source).toContain('data-risck-onboarding-shell="risck-ui-v2"');
    expect(source).toContain('<B2BOnboardingFlow');
    expect(source).toContain('onSaveDraft={saveDraft}');
    expect(source).toContain('onComplete={complete}');
    expect(source).toContain('getBillingRecoveryPath(locale, input.selectedPlan)');
    expect(source).toContain('onboarding-enterprise-v2.module.css');
    expect(source).not.toContain('onboarding-tailadmin.module.css');
  });

  it('uses a two-zone 290px onboarding navigation frame and retires the old three-column status rail', async () => {
    const css = await readFile(STYLES, 'utf8');

    expect(css).toContain('grid-template-columns: 290px minmax(0, 1fr)');
    expect(css).toContain('height: calc(100vh - 72px)');
    expect(css).toContain('aside:last-child');
    expect(css).toContain('display: none !important');
    expect(css).toContain('background: #07101a');
  });

  it('flattens the decorative onboarding hero and preserves responsive setup navigation', async () => {
    const css = await readFile(STYLES, 'utf8');

    expect(css).toContain("section[aria-labelledby='onboarding-title'] > div:first-child");
    expect(css).toContain('background: transparent !important');
    expect(css).toContain('box-shadow: none !important');
    expect(css).toContain('@media (max-width: 1279px)');
    expect(css).toContain('overflow-x: auto');
  });

  it('maps legacy cyan decoration to cobalt while leaving semantic emerald status available', async () => {
    const css = await readFile(STYLES, 'utf8');

    expect(css).toContain("[class*='bg-cyan-300']");
    expect(css).toContain('background: rgba(37, 99, 235, 0.07) !important');
    expect(css).toContain("[class*='text-cyan-200']");
    expect(css).not.toContain("[class*='text-emerald-300']");
  });
});