// Read-only admission guard for configuring a Stripe TEST webhook to an exact-SHA isolated QA deployment.
// This validates provided readback claims structurally; only independent provider evidence verifies their truth.
// It NEVER creates endpoints, delivers events, grants entitlements, or accepts an Enterprise gate.
function evaluatePhase2QaWebhookPreflight(input) {
  const problems=[];
  const fail=(code)=>problems.push(code);
  const sha=/^[a-f0-9]{40}$/;
  const release=input?.release??{}, deployment=input?.deployment??{}, database=input?.database??{}, stripe=input?.stripe??{};
  if(release.repository!=="renanescola40-afk/eurocomply_saas" || !sha.test(String(release.exactSha??""))) fail("release_source_unverified");
  if(!/^dpl_[A-Za-z0-9]+$/.test(String(deployment.id??"")) || deployment.status!=="READY" || deployment.environment!=="qa" || deployment.qaAliasVerified!==true) fail("isolated_qa_deployment_unverified");
  if(!sha.test(String(deployment.gitSha??"")) || deployment.gitSha!==release.exactSha || deployment.gitRepository!==release.repository || deployment.gitProviderReadback!==true) fail("deployment_git_provenance_unverified");
  if(database.projectRef!=="zrxrrfbllsxtleyxjpsz" || deployment.runtimeDatabaseProjectRef!==database.projectRef || database.isProduction!==false || database.providerReadback!==true) fail("runtime_qa_database_unverified");
  // A QA database hostname alone cannot prove safe event persistence.
  // Require an independently verified RLS-scoped writer before endpoint admission.
  // Claims here are structural; this function never grants or validates credentials.
  const writer=database.webhookWriter??{};
  if (writer.type!=="rls_scoped" || writer.qaProjectRef!=="zrxrrfbllsxtleyxjpsz" ||
      writer.qaProjectRef!==database.projectRef || writer.bypassRls!==false ||
      writer.providerReadback!==true || writer.applicationIntegrationVerified!==true ||
      writer.canPersistEvents!==true || writer.canUpdateEntitlements!==true)
    fail("qa_webhook_storage_writer_unverified");
  if(stripe.accountId!=="acct_1U6IuJGt3cgjPOtq" || stripe.livemode!==false || stripe.secretKeyMode!=="TEST" || stripe.providerReadback!==true) fail("stripe_test_account_unverified");
  if(stripe.qaSigningSecretConfigured!==true || stripe.qaSigningSecretBindingVerified!==true || stripe.signingSecretValueRead!==false) fail("stripe_qa_signing_binding_unverified");
  // Evidence claims are structural only; a provider must independently
  // authenticate each timestamp/alias/credential-mode assertion.
  const qaEnv=input?.qaEnvironment??{};
  if (qaEnv.id!=="env_NwUiDnnbo3AJ5eswTtoUXSIBTmTj" || qaEnv.providerReadback!==true ||
      qaEnv.releaseSha!==release.exactSha || deployment.qaAliasTargetId!==deployment.id)
    fail("qa_environment_alias_identity_unverified");
  const timeKeys=["stripeSecretUpdatedAtMs","stripePublishableUpdatedAtMs","webhookSecretUpdatedAtMs"];
  if (!Number.isSafeInteger(deployment.createdAtMs) || deployment.createdAtMs<=0 ||
      timeKeys.some(k=>!Number.isSafeInteger(qaEnv[k]) || qaEnv[k]<=0 ||
                       qaEnv[k]>deployment.createdAtMs))
    fail("qa_deployment_predates_stripe_test_configuration");
  if (qaEnv.runtimeOutboundEmailBlocked!==true || qaEnv.runtimeMailSinkAttested!==true ||
      qaEnv.productionCredentialsAbsentAttested!==true)
    fail("qa_runtime_email_and_secret_isolation_unverified");
  try {
    const url=new URL(String(stripe.candidateEndpointUrl??""));
    if (url.origin!=="https://eurocomply-saas-env-qa-renanescola40-afks-projects.vercel.app" ||
        url.pathname!=="/api/stripe/webhook" || url.search || url.hash ||
        url.username || url.password)
      fail("stripe_test_endpoint_qa_alias_unverified");
  } catch { fail("stripe_test_endpoint_qa_alias_unverified"); }
  const previous=stripe.existingEndpoint;
  if(previous && (previous.status!=="disabled" && !(previous.status==="enabled" && previous.verifiedQaDeploymentId===deployment.id && previous.mode==="TEST" && previous.providerReadback===true))) fail("existing_webhook_must_remain_safe");
  return {readyToConfigureTestWebhook:problems.length===0,blockers:problems,formalGateAccepted:false,providerDeliveryVerified:false};
}
export { evaluatePhase2QaWebhookPreflight };
