#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const FULL_SHA = /^[a-f0-9]{40}$/;
const UX_OUTPUT = 'docs/security/evidence/runtime/ux-acceptance-validation.json';
const LOCALE_OUTPUT = 'docs/security/evidence/runtime/localization-validation.json';
const DEFAULT_GITHUB_CHECKS = 'artifacts/enterprise-readiness/github-checks-evidence.json';
const REQUIRED_LOCALES = ['en', 'pt', 'es', 'fr', 'it', 'de'];

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

function checkStatus(document, name) {
  const check = document?.checks?.find((item) => item?.name === name);
  return check?.status === 'PASS';
}

function containsEvery(source, values) {
  return values.every((value) => source.includes(value));
}

function scorecardCheck(name, sourcePassed, executionProven, exactShaProvenance) {
  if (!sourcePassed) return { name, passed: false };
  if (!executionProven || !exactShaProvenance) return { name, status: 'NOT_VERIFIED' };
  return { name, passed: true };
}

export function evaluatePublicUxCoverage(
  specSource,
  {
    authenticatedProductTest = '',
    criticalFlowSpec = '',
    productJourneySpec = '',
    onboardingPage = '',
    onboardingComponent = '',
    dashboardPage = '',
    dashboardComponent = '',
  } = {},
) {
  const localeCoverage = REQUIRED_LOCALES.every((locale) => specSource.includes(`'${locale}'`));
  const onboardingObjectStepContract = containsEvery(onboardingComponent, [
    'const stepDefinitions = [',
    "id: 'create-organization'",
    "id: 'first-ai-system'",
    "id: 'readiness-score'",
    "id: 'documents'",
    "id: 'tasks'",
    "id: 'team'",
    "id: 'plan'",
  ]);
  const onboardingTupleStepContract = containsEvery(onboardingComponent, [
    'const steps = [',
    "['create-organization'",
    "['first-ai-system'",
    "['readiness-score'",
    "['documents'",
    "['tasks'",
    "['team'",
    "['plan'",
  ]);
  const checks = {
    dedicatedSuite: specSource.includes("test.describe('enterprise public UX acceptance'"),
    landing: specSource.includes('landing is localized, healthy and conversion-ready')
      && specSource.includes("page.locator('#waitlist-form')")
      && specSource.includes("page.locator('h1')"),
    pricing: specSource.includes('pricing is localized, healthy and actionable')
      && specSource.includes('/pricing')
      && specSource.includes('actionable controls'),
    login: specSource.includes('login is localized, healthy and usable')
      && specSource.includes('input[type="email"]')
      && specSource.includes('input[type="password"]')
      && specSource.includes('name: /google/i'),
    mobile: specSource.includes('width: 390')
      && specSource.includes('expectNoHorizontalOverflow')
      && specSource.includes('mobile public conversion surfaces'),
    supportedLocales: localeCoverage
      && specSource.includes("toHaveAttribute('lang', locale)")
      && specSource.includes('retain the locale prefix'),
    controlledErrors: specSource.includes('Unhandled Runtime Error')
      && specSource.includes('/undefined')
      && specSource.includes('visible placeholder links'),
    onboardingComponentAcceptance: containsEvery(authenticatedProductTest, [
      "describe('authenticated onboarding UX acceptance'",
      'validates required fields, derives a safe slug, saves a draft and resumes progress',
      'keeps invalid AI-system input on the active step and completes through an explicit dashboard destination',
      '<B2BOnboardingFlow',
      "expect(navigation.push).toHaveBeenCalledWith('/en/dashboard/organizations?onboarding=completed')",
    ]),
    onboardingSourceContract: (onboardingObjectStepContract || onboardingTupleStepContract)
      && containsEvery(onboardingComponent, [
        'role="alert"',
        'onSaveDraft',
        'onComplete',
        'router.push',
      ])
      && containsEvery(onboardingPage, [
        "export const dynamic = 'force-dynamic'",
        "export const fetchCache = 'force-no-store'",
        'getOnboardingActivationState(user.id)',
        '<B2BOnboardingFlow',
      ]),
    onboardingRouteBoundary: criticalFlowSpec.includes("{ area: 'onboarding', path: '/onboarding' }")
      && criticalFlowSpec.includes('redirects anonymous visitors to localized login')
      && productJourneySpec.includes("'/pt/onboarding?plan=professional'")
      && productJourneySpec.includes('preserves next'),
    dashboardComponentAcceptance: containsEvery(authenticatedProductTest, [
      "describe('authenticated dashboard UX acceptance'",
      'renders an accessible command center with actionable, localized, tenant-safe destinations',
      'exposes workspace and billing actions only to an authorized management state',
      '<EnterpriseComplianceCommandCenter',
      "a[href=\"/en/dashboard/organizations/billing\"]",
    ]),
    dashboardSourceContract: containsEvery(dashboardComponent, [
      'aria-labelledby="ui-v2-dashboard-title"',
      'AI Governance Overview',
      'Risk distribution',
      'Governance maturity',
      'Review pipeline',
      'Evidence readiness',
      'not a legal compliance certification',
      'href: `/${locale}/ai-systems`',
      'href: tasksPath',
    ]) && containsEvery(dashboardPage, [
      "export const dynamic = 'force-dynamic'",
      "export const fetchCache = 'force-no-store'",
      'getOrganizationDashboardData(user.id)',
      '<EnterpriseExecutiveOverviewV2',
      '<DashboardHomeOverview',
      '<OnboardingProgressCard',
    ]),
    dashboardRouteBoundary: criticalFlowSpec.includes("{ area: 'dashboard organization', path: '/dashboard/organizations' }")
      && criticalFlowSpec.includes('redirects anonymous visitors to localized login')
      && productJourneySpec.includes("'/pt/dashboard/organizations'")
      && productJourneySpec.includes('anonymous private redirect response is no-store'),
  };

  const onboardingCoverage = checks.onboardingComponentAcceptance
    && checks.onboardingSourceContract
    && checks.onboardingRouteBoundary;
  const dashboardCoverage = checks.dashboardComponentAcceptance
    && checks.dashboardSourceContract
    && checks.dashboardRouteBoundary;

  return {
    checks,
    publicUxCoverage: checks.dedicatedSuite
      && checks.landing
      && checks.pricing
      && checks.login
      && checks.mobile
      && checks.controlledErrors,
    onboardingCoverage,
    dashboardCoverage,
    localizationCoverage: checks.supportedLocales,
  };
}

export function evaluateExactShaChecks(githubChecks, targetSha) {
  return {
    evidenceComplete: githubChecks?.status === 'Complete' && githubChecks?.outcome === 'passed',
    exactSha: githubChecks?.targetSha === targetSha,
    fullSecuritySuite: checkStatus(githubChecks, 'fullSecuritySuite'),
    requiredChecks: checkStatus(githubChecks, 'requiredChecks'),
  };
}

export function buildPublicUxEvidence({
  coverage,
  exactChecks,
  repository,
  branch,
  targetSha,
  observedSha,
  runId,
  githubActions,
  generatedAt = new Date().toISOString(),
  sourceDigests,
}) {
  const provenanceFailures = [];
  if (!githubActions) provenanceFailures.push('evidence must be generated by GitHub Actions');
  if (repository !== CANONICAL_REPOSITORY) provenanceFailures.push('repository must be canonical');
  if (!String(branch ?? '').trim()) provenanceFailures.push('branch must be present');
  if (!FULL_SHA.test(targetSha)) provenanceFailures.push('targetSha must be a full Git SHA');
  if (observedSha !== targetSha) provenanceFailures.push('checked-out SHA must equal targetSha');
  if (!/^\d+$/.test(String(runId))) provenanceFailures.push('runId must be numeric');

  const exactShaProvenance = provenanceFailures.length === 0;
  const executionProven = exactChecks.evidenceComplete
    && exactChecks.exactSha
    && exactChecks.fullSecuritySuite
    && exactChecks.requiredChecks;
  const completeUxCoverage = coverage.publicUxCoverage
    && coverage.onboardingCoverage
    && coverage.dashboardCoverage;
  const uxPassed = completeUxCoverage && executionProven && exactShaProvenance;
  const localizationPassed = coverage.localizationCoverage && executionProven && exactShaProvenance;

  const common = {
    generatedAt,
    repository,
    branch,
    targetSha,
    observedSha,
    githubRunId: String(runId),
    sourceDigests,
    executionEvidence: {
      exactShaChecksComplete: exactChecks.evidenceComplete,
      exactShaMatches: exactChecks.exactSha,
      fullSecuritySuitePassed: exactChecks.fullSecuritySuite,
      requiredChecksPassed: exactChecks.requiredChecks,
    },
    failures: provenanceFailures,
    evidenceIntegrity: {
      containsSensitiveValues: false,
      rawBrowserTracesStored: false,
      screenshotsStoredInEvidence: false,
      customerDataStored: false,
      productionSessionStored: false,
      exactShaBound: exactShaProvenance && exactChecks.exactSha,
    },
  };

  return {
    ux: {
      schema: 'risck-comply.product-ux-acceptance-evidence.v2',
      evidenceItem: 'ux-acceptance-validation',
      status: uxPassed ? 'Complete' : 'Open',
      outcome: uxPassed ? 'passed' : 'not_verified',
      ...common,
      checks: [
        scorecardCheck('landing', coverage.checks.landing, executionProven, exactShaProvenance),
        scorecardCheck('pricing', coverage.checks.pricing, executionProven, exactShaProvenance),
        scorecardCheck('login', coverage.checks.login, executionProven, exactShaProvenance),
        scorecardCheck('mobile', coverage.checks.mobile, executionProven, exactShaProvenance),
        scorecardCheck('onboarding', coverage.onboardingCoverage, executionProven, exactShaProvenance),
        scorecardCheck('dashboard', coverage.dashboardCoverage, executionProven, exactShaProvenance),
      ],
      checkResults: {
        ...coverage.checks,
        publicUxCoverage: coverage.publicUxCoverage,
        onboardingCoverage: coverage.onboardingCoverage,
        dashboardCoverage: coverage.dashboardCoverage,
        exactShaProvenance,
        executionProven,
      },
      controlsVerified: uxPassed
        ? [
            'Landing acceptance validated',
            'Pricing acceptance validated',
            'Login UX acceptance validated',
            'Mobile acceptance validated',
            'Onboarding UX acceptance validated',
            'Dashboard UX acceptance validated',
          ]
        : [],
      evidenceLocations: [
        'tests/e2e/enterprise-public-ux-acceptance.spec.ts',
        'tests/e2e/enterprise-critical-flows.spec.ts',
        'tests/e2e/product-critical-journeys.spec.ts',
        'tests/product/authenticated-product-ux.test.tsx',
        'src/components/onboarding/b2b-onboarding-flow.tsx',
        'src/components/dashboard/enterprise-executive-overview-v2.tsx',
        'src/app/[locale]/onboarding/page.tsx',
        'src/app/[locale]/dashboard/organizations/page.tsx',
        'playwright.config.ts',
        DEFAULT_GITHUB_CHECKS,
      ],
      evidenceBoundary: 'Validates public landing, pricing, login and mobile UX in Playwright; validates onboarding interactions, authenticated dashboard control behavior, the UI V2 dashboard source contract and protected-route redirects on the exact SHA. It does not create an authentication bypass, store a production session, exercise live Supabase data, validate screen-reader software, prove provider behavior or replace authenticated production smoke.',
    },
    localization: {
      schema: 'risck-comply.localization-validation.v1',
      evidenceItem: 'localization-validation',
      status: localizationPassed ? 'Complete' : 'Open',
      outcome: localizationPassed ? 'passed' : 'not_verified',
      ...common,
      checks: [
        scorecardCheck('supportedLocales', coverage.localizationCoverage, executionProven, exactShaProvenance),
      ],
      checkResults: {
        supportedLocales: coverage.checks.supportedLocales,
        expectedLocales: REQUIRED_LOCALES,
        exactShaProvenance,
        executionProven,
      },
      controlsVerified: localizationPassed ? ['Supported locales validated'] : [],
      evidenceLocations: [
        'src/lib/i18n/routing.ts',
        'tests/e2e/enterprise-public-ux-acceptance.spec.ts',
        DEFAULT_GITHUB_CHECKS,
      ],
      evidenceBoundary: 'Validates that every supported locale prefix renders the public landing, pricing and login surfaces with matching HTML language metadata on the exact SHA. It does not certify translation quality or legal review of localized copy.',
    },
  };
}

function head(root) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function run() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const sources = {
    publicSpec: readFileSync(join(root, 'tests/e2e/enterprise-public-ux-acceptance.spec.ts'), 'utf8'),
    authenticatedProductTest: readFileSync(join(root, 'tests/product/authenticated-product-ux.test.tsx'), 'utf8'),
    criticalFlowSpec: readFileSync(join(root, 'tests/e2e/enterprise-critical-flows.spec.ts'), 'utf8'),
    productJourneySpec: readFileSync(join(root, 'tests/e2e/product-critical-journeys.spec.ts'), 'utf8'),
    onboardingPage: readFileSync(join(root, 'src/app/[locale]/onboarding/page.tsx'), 'utf8'),
    onboardingComponent: readFileSync(join(root, 'src/components/onboarding/b2b-onboarding-flow.tsx'), 'utf8'),
    dashboardPage: readFileSync(join(root, 'src/app/[locale]/dashboard/organizations/page.tsx'), 'utf8'),
    dashboardComponent: readFileSync(join(root, 'src/components/dashboard/enterprise-executive-overview-v2.tsx'), 'utf8'),
    routing: readFileSync(join(root, 'src/lib/i18n/routing.ts'), 'utf8'),
    playwrightConfig: readFileSync(join(root, 'playwright.config.ts'), 'utf8'),
  };
  const githubChecksPath = process.env.GITHUB_CHECKS_EVIDENCE_PATH || DEFAULT_GITHUB_CHECKS;
  const githubChecksRaw = readFileSync(join(root, githubChecksPath), 'utf8');
  const githubChecks = JSON.parse(githubChecksRaw);
  const targetSha = process.env.TARGET_SHA || process.env.GITHUB_SHA || '';
  const coverage = evaluatePublicUxCoverage(sources.publicSpec, sources);
  const exactChecks = evaluateExactShaChecks(githubChecks, targetSha);
  const evidence = buildPublicUxEvidence({
    coverage,
    exactChecks,
    repository: process.env.GITHUB_REPOSITORY ?? '',
    branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || '',
    targetSha,
    observedSha: head(root),
    runId: process.env.GITHUB_RUN_ID ?? '',
    githubActions: process.env.GITHUB_ACTIONS === 'true',
    sourceDigests: {
      publicAcceptanceSpec: digest(sources.publicSpec),
      authenticatedProductTest: digest(sources.authenticatedProductTest),
      criticalFlowSpec: digest(sources.criticalFlowSpec),
      productJourneySpec: digest(sources.productJourneySpec),
      onboardingPage: digest(sources.onboardingPage),
      onboardingComponent: digest(sources.onboardingComponent),
      dashboardPage: digest(sources.dashboardPage),
      dashboardComponent: digest(sources.dashboardComponent),
      routing: digest(sources.routing),
      playwrightConfig: digest(sources.playwrightConfig),
      githubChecks: digest(githubChecksRaw),
    },
  });

  for (const [relativePath, document] of [
    [UX_OUTPUT, evidence.ux],
    [LOCALE_OUTPUT, evidence.localization],
  ]) {
    const output = join(root, relativePath);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`);
  }

  if (evidence.ux.status !== 'Complete' || evidence.localization.status !== 'Complete') process.exit(1);
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) run();