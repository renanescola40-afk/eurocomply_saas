import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluatePhase2QaWebhookPreflight as evaluate } from '../../scripts/enterprise-evidence/phase2-qa-webhook-preflight.mjs';

const REPO = 'renanescola40-afk/eurocomply_saas';
const SHA = 'a'.repeat(40);
function validFixture() {
  return {
    release: { repository: REPO, exactSha: SHA },
    deployment: { id: 'dpl_Valid12345', status: 'READY', environment: 'qa',
      qaAliasVerified: true, qaAliasTargetId: 'dpl_Valid12345',
      createdAtMs: 1793915000000, gitSha: SHA, gitRepository: REPO,
      gitProviderReadback: true, runtimeDatabaseProjectRef: 'zrxrrfbllsxtleyxjpsz' },
    database: { projectRef: 'zrxrrfbllsxtleyxjpsz', isProduction: false, providerReadback: true },
    qaEnvironment: {
      id: 'env_NwUiDnnbo3AJ5eswTtoUXSIBTmTj', providerReadback:true,
      releaseSha:SHA, stripeSecretUpdatedAtMs:1793912811931,
      stripePublishableUpdatedAtMs:1793912584481,
      webhookSecretUpdatedAtMs:1793905161877,
      runtimeOutboundEmailBlocked:true, runtimeMailSinkAttested:true,
      productionCredentialsAbsentAttested:true,
    },
    stripe: { candidateEndpointUrl:'https://eurocomply-saas-env-qa-renanescola40-afks-projects.vercel.app/api/stripe/webhook',
      accountId: 'acct_1U6IuJGt3cgjPOtq', livemode: false, secretKeyMode: 'TEST',
      providerReadback: true, qaSigningSecretConfigured: true,
      qaSigningSecretBindingVerified: true, signingSecretValueRead: false,
      existingEndpoint: { status: 'disabled' } },
  };
}
function denied(name, mutate, reason) {
  test(name, () => {
    const input = validFixture();
    mutate(input);
    const actual = evaluate(input);
    assert.equal(actual.readyToConfigureTestWebhook, false);
    assert.ok(actual.blockers.includes(reason), JSON.stringify(actual));
    assert.equal(actual.formalGateAccepted, false);
    assert.equal(actual.providerDeliveryVerified, false);
  });
}
test('synthetic fully attributed QA inputs are only eligible for TEST endpoint configuration, not gate acceptance', () => {
  assert.deepEqual(evaluate(validFixture()), {
    readyToConfigureTestWebhook: true, blockers: [], formalGateAccepted: false, providerDeliveryVerified: false,
  });
});
test('fails closed with no readbacks', () => {
  assert.equal(evaluate(null).readyToConfigureTestWebhook, false);
});
denied('rejects stale deployment git SHA', x => { x.deployment.gitSha = 'b'.repeat(40); }, 'deployment_git_provenance_unverified');
denied('rejects READY deployment without provider git provenance', x => { x.deployment.gitProviderReadback = false; }, 'deployment_git_provenance_unverified');
denied('rejects a production deployment', x => { x.deployment.environment = 'production'; }, 'isolated_qa_deployment_unverified');
denied('rejects unverified QA alias', x => { x.deployment.qaAliasVerified = false; }, 'isolated_qa_deployment_unverified');
denied('rejects runtime database bound to production', x => { x.deployment.runtimeDatabaseProjectRef = 'tganhbbhfxcpblmgqprg'; }, 'runtime_qa_database_unverified');
denied('rejects missing provider database readback', x => { x.database.providerReadback = false; }, 'runtime_qa_database_unverified');
denied('rejects LIVE Stripe keys', x => { x.stripe.secretKeyMode = 'LIVE'; }, 'stripe_test_account_unverified');
denied('rejects LIVE Stripe account readback', x => { x.stripe.livemode = true; }, 'stripe_test_account_unverified');
denied('rejects missing QA-only signing secret confirmation', x => { x.stripe.qaSigningSecretConfigured = false; }, 'stripe_qa_signing_binding_unverified');
denied('rejects reading or storing webhook signing secret values', x => { x.stripe.signingSecretValueRead = true; }, 'stripe_qa_signing_binding_unverified');
denied('refuses to overwrite an enabled webhook aimed at an older Preview', x => {
  x.stripe.existingEndpoint = { status: 'enabled', verifiedQaDeploymentId: 'dpl_Old12345', mode: 'TEST', providerReadback: true };
}, 'existing_webhook_must_remain_safe');
test('a pre-existing disabled old endpoint remains untouched while configuring a new TEST-only endpoint', () => {
  assert.equal(evaluate(validFixture()).readyToConfigureTestWebhook, true);
});

denied('rejects actual stale QA deployment created before TEST secret keys', x => {
  x.deployment.createdAtMs = 1793906608949;
}, 'qa_deployment_predates_stripe_test_configuration');
denied('rejects alias targeting a different READY deployment', x => {
  x.deployment.qaAliasTargetId = 'dpl_OldPreview1234';
}, 'qa_environment_alias_identity_unverified');
denied('rejects environment whose release SHA does not match reviewed SHA', x => {
  x.qaEnvironment.releaseSha = 'b'.repeat(40);
}, 'qa_environment_alias_identity_unverified');
denied('rejects QA runtime without confirmed outbound email block', x => {
  x.qaEnvironment.runtimeOutboundEmailBlocked = false;
}, 'qa_runtime_email_and_secret_isolation_unverified');
denied('rejects QA runtime without independently attested mail sink', x => {
  x.qaEnvironment.runtimeMailSinkAttested = false;
}, 'qa_runtime_email_and_secret_isolation_unverified');
denied('rejects QA runtime with unverified credential isolation', x => {
  x.qaEnvironment.productionCredentialsAbsentAttested = false;
}, 'qa_runtime_email_and_secret_isolation_unverified');
denied('rejects webhook target containing Vercel bypass query token', x => {
  x.stripe.candidateEndpointUrl += '?x-vercel-protection-bypass=SYNTHETIC';
}, 'stripe_test_endpoint_qa_alias_unverified');
denied('rejects webhook configured against obsolete Vercel preview URL', x => {
  x.stripe.candidateEndpointUrl='https://old-preview.example.vercel.app/api/stripe/webhook';
}, 'stripe_test_endpoint_qa_alias_unverified');
denied('rejects webhook endpoint URL using the production host', x => {
  x.stripe.candidateEndpointUrl='https://www.risckcomply.com/api/stripe/webhook';
}, 'stripe_test_endpoint_qa_alias_unverified');
denied('rejects preflight with fake or missing provider evidence freshness', x => {
  x.qaEnvironment.stripeSecretUpdatedAtMs = undefined;
}, 'qa_deployment_predates_stripe_test_configuration');
