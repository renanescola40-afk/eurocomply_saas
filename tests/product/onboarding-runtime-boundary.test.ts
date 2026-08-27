import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { toOnboardingMutationFailure } from '@/lib/onboarding/action-failure';
import { getOnboardingPlanIntent } from '@/lib/onboarding/plan-intent';

const pageSource = readFileSync(resolve(process.cwd(), 'src/app/[locale]/onboarding/page.tsx'), 'utf8');
const boundarySource = readFileSync(resolve(process.cwd(), 'src/components/onboarding/onboarding-runtime-boundary.tsx'), 'utf8');

describe('onboarding runtime boundary', () => {
  it('maps canonical and legacy billing links without silently losing Starter selection', () => {
    expect(getOnboardingPlanIntent('starter')).toBe('essential');
    expect(getOnboardingPlanIntent('essential')).toBe('essential');
    expect(getOnboardingPlanIntent('growth')).toBe('professional');
    expect(getOnboardingPlanIntent('professional')).toBe('professional');
    expect(getOnboardingPlanIntent('business')).toBe('business');
    expect(getOnboardingPlanIntent('enterprise')).toBe('enterprise');
    expect(getOnboardingPlanIntent('unknown-plan')).toBe('professional');
    expect(getOnboardingPlanIntent(undefined)).toBe('professional');
  });

  it('never serializes provider or database details into the browser-facing error', () => {
    const providerDetail = 'postgres://admin:secret@example.test tenant-row-detail';
    const result = toOnboardingMutationFailure(new Error(providerDetail), 'pt', 'complete');

    expect(result).toMatchObject({
      ok: false,
      status: 'error',
      code: 'runtime_unavailable',
      retryable: true,
    });
    expect(result.message).toContain('Não foi possível concluir');
    expect(result.message).not.toContain('postgres');
    expect(result.message).not.toContain('secret');
    expect(JSON.stringify(result)).not.toContain(providerDetail);
  });

  it('returns specific bounded guidance for authorization and invitation failures', () => {
    const denied = toOnboardingMutationFailure(
      new Error('You do not have access to complete this onboarding.'),
      'en',
      'complete',
    );
    const invitation = toOnboardingMutationFailure(
      new Error('Onboarding data was saved, but invitation delivery failed.'),
      'pt',
      'complete',
    );

    expect(denied).toMatchObject({ code: 'not_authorized', retryable: false });
    expect(denied.message).toContain('not allowed');
    expect(invitation).toMatchObject({ code: 'invitation_delivery_failed', retryable: true });
    expect(invitation.message).toContain('convites');
  });

  it('catches both server mutations and exposes one assisted Enterprise path', () => {
    expect(pageSource).toContain("toOnboardingMutationFailure(error, safeLocale, 'save')");
    expect(pageSource).toContain("toOnboardingMutationFailure(error, safeLocale, 'complete')");
    expect(pageSource).toContain('getOnboardingPlanIntent(resolvedSearchParams.plan)');

    expect(boundarySource).toContain('if (!result.ok)');
    expect(boundarySource).toContain('throw new Error(result.message)');
    expect(boundarySource).toContain('intent=enterprise&plan=enterprise&source=onboarding');
    expect(boundarySource).toContain('Solicitar onboarding assistido para grandes empresas');
    expect(boundarySource).not.toContain('caught.message');
  });
});
