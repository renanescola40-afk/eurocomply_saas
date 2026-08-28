import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { classifyCommercialCtaContext, resolveCommercialCtaId } from '@/lib/analytics/commercial-cta';
import { analyticsEvents } from '@/lib/analytics/events';
import { classifyPublicMarketingPage } from '@/lib/analytics/marketing-attribution';

const component = readFileSync(join(process.cwd(), 'src/components/marketing/tools/ai-act-readiness-assessment.tsx'), 'utf8');

describe('free-tool acquisition contract', () => {
  it('classifies tool pages as consent-gated resource acquisition surfaces', () => {
    expect(classifyPublicMarketingPage('/en/tools/ai-act-readiness')).toEqual({
      event: analyticsEvents.resourceView,
      pageType: 'tool',
      funnelStage: 'consideration',
    });
    expect(classifyCommercialCtaContext('/en/tools/ai-act-readiness')).toEqual({
      pageType: 'tool',
      funnelStage: 'consideration',
    });
  });

  it('does not classify private lookalike routes as public tools', () => {
    expect(classifyPublicMarketingPage('/en/dashboard/tools')).toBeNull();
    expect(classifyCommercialCtaContext('/en/dashboard/tools')).toBeNull();
  });

  it('accepts stable explicit tool CTA ids without collecting button copy', () => {
    expect(resolveCommercialCtaId({
      pathname: '/en/tools/ai-act-readiness',
      explicitId: 'tool-ai-act-readiness-signup',
      href: '/en/signup',
    })).toBe('tool-ai-act-readiness-signup');
    expect(resolveCommercialCtaId({
      pathname: '/en/tools/ai-act-readiness',
      explicitId: 'Bad CTA with spaces',
    })).toBeNull();
  });

  it('keeps the assessment client-only and free of PII submission', () => {
    expect(component).not.toContain("fetch('");
    expect(component).not.toContain('workEmail');
    expect(component).not.toContain('fullName');
    expect(component).not.toContain('companyName');
    expect(component).toContain('not submitted to RISCK COMPLY');
    expect(component).toContain('tool-ai-act-readiness-copy');
    expect(component).toContain('tool-ai-act-readiness-signup');
    expect(component).toContain('tool-ai-act-readiness-demo');
  });
});
