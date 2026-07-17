// @vitest-environment jsdom

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { B2BOnboardingFlow } from '@/components/onboarding/b2b-onboarding-flow';
import { EnterpriseComplianceCommandCenter } from '@/components/dashboard/enterprise-compliance-command-center';
import type { OnboardingActivationInitialState } from '@/lib/onboarding/activation';

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: navigation.push,
    replace: navigation.replace,
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

type MountedView = {
  container: HTMLDivElement;
  root: Root;
};

const mountedViews: MountedView[] = [];

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

afterEach(async () => {
  navigation.push.mockReset();
  navigation.replace.mockReset();

  while (mountedViews.length > 0) {
    const mounted = mountedViews.pop();
    if (!mounted) continue;
    await act(async () => mounted.root.unmount());
    mounted.container.remove();
  }
});

async function mount(view: ReactNode) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mountedViews.push({ container, root });
  await act(async () => root.render(view));
  return container;
}

function button(container: HTMLElement, name: string) {
  const match = [...container.querySelectorAll<HTMLButtonElement>('button')]
    .find((candidate) => candidate.textContent?.replace(/\s+/g, ' ').trim() === name);
  if (!match) throw new Error(`Button not found: ${name}`);
  return match;
}

async function click(element: HTMLElement) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

async function typeInto(input: HTMLInputElement, value: string) {
  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function emptyOnboardingState(): OnboardingActivationInitialState {
  return {
    organization: null,
    firstAiSystem: null,
    latestRun: null,
  };
}

function seededOnboardingState(): OnboardingActivationInitialState {
  return {
    organization: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Acme Europe',
      slug: 'acme-europe',
      country: 'pt',
      companyType: 'enterprise',
      sector: 'saas',
      aiUsageSummary: 'Customer support uses an assisted drafting system.',
      onboardingStatus: 'in_progress',
      onboardingCompletedAt: null,
      isOnboardingCompleted: false,
      onboardingStep: 'first-ai-system',
      readinessScore: 38,
      selectedPlan: 'professional',
    },
    firstAiSystem: null,
    latestRun: null,
  };
}

describe('authenticated onboarding UX acceptance', () => {
  it('validates required fields, derives a safe slug, saves a draft and resumes progress', async () => {
    const onSaveDraft = vi.fn().mockResolvedValue({
      organizationId: '00000000-0000-4000-8000-000000000001',
      status: 'saved',
    });
    const onComplete = vi.fn();
    const container = await mount(
      <B2BOnboardingFlow
        locale="pt"
        requestedPlan="professional"
        initialState={emptyOnboardingState()}
        onSaveDraft={onSaveDraft}
        onComplete={onComplete}
      />,
    );

    expect(container.textContent).toContain('Passo 1 de 12'.replace('Passo', 'Step'));
    await click(button(container, 'Continuar'));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Preencha os campos obrigatórios');

    const organizationName = container.querySelector<HTMLInputElement>('#organization-name');
    const organizationSlug = container.querySelector<HTMLInputElement>('#organization-slug');
    expect(organizationName).not.toBeNull();
    expect(organizationSlug).not.toBeNull();

    await typeInto(organizationName!, 'Ácme Europa & IA');
    expect(organizationSlug?.value).toBe('acme-europa-ia');

    await click(button(container, 'Guardar e continuar depois'));
    expect(onSaveDraft).toHaveBeenCalledWith(expect.objectContaining({
      organizationName: 'Ácme Europa & IA',
      slug: 'acme-europa-ia',
      onboardingStep: 'create-organization',
      selectedPlan: 'professional',
    }));
    expect(container.textContent).toContain('Progresso guardado');

    await click(button(container, 'Continuar'));
    expect(container.textContent).toContain('Step 2 of 12');
    expect(container.textContent).toContain('Main operating country');
  });

  it('keeps invalid AI-system input on the active step and completes through an explicit dashboard destination', async () => {
    const onSaveDraft = vi.fn();
    const onComplete = vi.fn().mockResolvedValue({
      organizationId: '00000000-0000-4000-8000-000000000001',
      status: 'completed',
      readinessScore: 76,
      dashboardPath: '/en/dashboard/organizations?onboarding=completed',
    });
    const container = await mount(
      <B2BOnboardingFlow
        locale="en"
        requestedPlan="professional"
        initialState={seededOnboardingState()}
        onSaveDraft={onSaveDraft}
        onComplete={onComplete}
      />,
    );

    expect(container.textContent).toContain('Step 6 of 12');
    await click(button(container, 'Continue'));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Complete the required fields');
    expect(container.textContent).toContain('First AI system');

    await typeInto(container.querySelector<HTMLInputElement>('#ai-system-name')!, 'Support Copilot');
    await typeInto(container.querySelector<HTMLInputElement>('#owner-team')!, 'Customer Operations');
    await typeInto(
      container.querySelector<HTMLInputElement>('#ai-system-use-case')!,
      'Summarises customer requests and proposes draft replies for human review.',
    );
    await click(button(container, 'Continue'));
    expect(container.textContent).toContain('Initial classification');

    await click(button(container, 'Plan or trial'));
    await click(button(container, 'Professional'));
    await click(button(container, 'Generate readiness score'));

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      organizationName: 'Acme Europe',
      aiSystemName: 'Support Copilot',
      ownerTeam: 'Customer Operations',
      selectedPlan: 'professional',
    }));
    expect(navigation.push).toHaveBeenCalledWith('/en/dashboard/organizations?onboarding=completed');
    expect(container.textContent).toContain('Onboarding completed. Opening dashboard');
  });
});

describe('authenticated dashboard UX acceptance', () => {
  const summary = {
    complianceScore: 72,
    openTasks: 4,
    highRiskVendors: 1,
    openRisks: 3,
    criticalRisks: 2,
    missingDocuments: 2,
    totals: {
      tasks: 8,
      vendors: 4,
      risks: 7,
      documents: 10,
    },
  };

  const aiSystemSummary = {
    total: 3,
    high: 1,
    unacceptable: 0,
    limited: 1,
    minimal: 1,
    previews: [],
  };

  it('renders an accessible command center with actionable, localized, tenant-safe destinations', async () => {
    const container = await mount(
      <EnterpriseComplianceCommandCenter
        locale="pt"
        summary={summary}
        tasks={[{ id: 'task-1', title: 'Review transparency notice', status: 'open' }]}
        topRisks={[{ id: 'risk-1', title: 'Customer support transparency', risk_score: 16 }]}
        vendorsRequiringReview={[{ id: 'vendor-1', name: 'Synthetic AI Vendor', risk_level: 'high' }]}
        documentsExpiringSoon={[{ id: 'document-1', title: 'AI Policy', status: 'approved' }]}
        aiSystemSummary={aiSystemSummary}
        auditEvents={[{ id: 'audit-1', action: 'document_approved' }]}
        workflowReadiness={{ status: 'attention', reasons: ['open-compliance-work'] }}
        basePath="/pt/dashboard/organizations"
        tasksPath="/pt/aprovacoes"
        planName="Growth"
        limitsSummary="Documents: 100 · Users: 10"
        currentUserRole="viewer"
        canManageWorkspace={false}
        canManageBilling={false}
      />,
    );

    const region = container.querySelector<HTMLElement>('section[aria-labelledby="enterprise-command-center-title"]');
    expect(region).not.toBeNull();
    expect(container.querySelector('#enterprise-command-center-title')?.textContent).toBe('AI Act readiness cockpit');
    expect(container.textContent).toContain('72%');
    expect(container.textContent).toContain('3');
    expect(container.textContent).toContain('Role: viewer');
    expect(container.textContent).toContain('Needs attention');
    expect(container.textContent).not.toContain('Open billing');
    expect(container.textContent).not.toContain('Review tasks');

    const links = [...container.querySelectorAll<HTMLAnchorElement>('a[href]')];
    expect(links.length).toBeGreaterThanOrEqual(9);
    expect(links.every((link) => link.getAttribute('href')?.startsWith('/pt/'))).toBe(true);
    expect(links.some((link) => link.getAttribute('href') === '/pt/dashboard/organizations/documents')).toBe(true);
    expect(links.some((link) => link.getAttribute('href') === '/pt/ai-systems')).toBe(true);
    expect(links.some((link) => link.getAttribute('href')?.includes('/undefined'))).toBe(false);
  });

  it('exposes workspace and billing actions only to an authorized management state', async () => {
    const container = await mount(
      <EnterpriseComplianceCommandCenter
        locale="en"
        summary={summary}
        tasks={[]}
        topRisks={[]}
        vendorsRequiringReview={[]}
        documentsExpiringSoon={[]}
        aiSystemSummary={aiSystemSummary}
        auditEvents={[]}
        workflowReadiness={{ status: 'ready', reasons: [] }}
        basePath="/en/dashboard/organizations"
        tasksPath="/en/aprovacoes"
        planName="Enterprise"
        limitsSummary="Documents: Unlimited · Users: Unlimited"
        currentUserRole="owner"
        canManageWorkspace
        canManageBilling
      />,
    );

    expect(container.textContent).toContain('Strong readiness posture');
    expect(container.textContent).toContain('Review tasks');
    expect(container.textContent).toContain('Open billing');
    expect(container.querySelector<HTMLAnchorElement>('a[href="/en/aprovacoes"]')).not.toBeNull();
    expect(container.querySelector<HTMLAnchorElement>('a[href="/en/dashboard/organizations/billing"]')).not.toBeNull();
  });
});
