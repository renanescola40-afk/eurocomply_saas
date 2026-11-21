// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AiSystemsClient } from '@/app/[locale]/ai-systems/ai-systems-client';
import type { AiGovernanceReadiness } from '@/server/ai-governance/readiness';

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: navigation.refresh }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) =>
    createElement('a', { href }, children),
}));

vi.mock('@/app/[locale]/ai-systems/readiness-card', () => ({
  ReadinessCard: () => null,
}));

vi.mock('@/app/[locale]/ai-systems/role-wizard-card', () => ({
  RoleWizardCard: () => null,
}));

const readiness = {
  score: null,
  status: 'not_started',
  boardSummary: '',
  coverage: {
    inventory: 0,
    classification: 0,
    owners: 0,
    vendors: 0,
    highRiskGovernance: 0,
    incidentRegister: 0,
    policyPack: 0,
  },
  gaps: [],
  actionPlan: [],
} as unknown as AiGovernanceReadiness;

const mounted: Array<{ container: HTMLDivElement; root: Root }> = [];

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

afterEach(async () => {
  vi.unstubAllGlobals();
  navigation.refresh.mockReset();
  while (mounted.length) {
    const view = mounted.pop();
    if (!view) continue;
    await act(async () => view.root.unmount());
    view.container.remove();
  }
});

async function mountInventory() {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mounted.push({ container, root });
  await act(async () => {
    root.render(createElement(AiSystemsClient, {
      locale: 'en',
      initialSystems: [],
      organizationName: 'Pilot workspace',
      readiness,
    }));
  });
  return container;
}

async function submitInventory(container: HTMLElement) {
  const form = container.querySelector('form');
  expect(form).not.toBeNull();
  await act(async () => {
    form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

function expectRetryableFailure(container: HTMLElement) {
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('Could not create AI system.');
  const submitButton = container.querySelector<HTMLButtonElement>('form button[type="submit"]');
  expect(submitButton).not.toBeNull();
  expect(submitButton?.disabled).toBe(false);
  expect(submitButton?.textContent).toContain('Classify and save');
  expect(navigation.refresh).not.toHaveBeenCalled();
}

describe('AI inventory save resilience', () => {
  it('provides an accessible label for the required use case', async () => {
    const container = await mountInventory();
    const useCase = container.querySelector<HTMLTextAreaElement>('textarea[required]');
    expect(useCase).not.toBeNull();
    expect(useCase?.getAttribute('aria-label')).toBe('Use case');
  });

  it('shows a retryable error rather than remaining busy when the API request fails', async () => {
    const fetchStub = vi.fn().mockRejectedValue(new TypeError('Network request failed'));
    vi.stubGlobal('fetch', fetchStub);
    const container = await mountInventory();

    await submitInventory(container);

    expect(fetchStub).toHaveBeenCalledTimes(1);
    expectRetryableFailure(container);
  });

  it('rejects a malformed successful response rather than accepting an undefined system', async () => {
    const fetchStub = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchStub);
    const container = await mountInventory();

    await submitInventory(container);

    expect(fetchStub).toHaveBeenCalledTimes(1);
    expectRetryableFailure(container);
    expect(container.textContent).toContain('No AI systems registered yet');
  });
});
