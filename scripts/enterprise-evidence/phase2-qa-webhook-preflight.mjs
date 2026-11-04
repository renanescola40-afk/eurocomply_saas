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
  if(stripe.accountId!=="acct_1U6IuJGt3cgjPOtq" || stripe.livemode!==false || stripe.secretKeyMode!=="TEST" || stripe.providerReadback!==true) fail("stripe_test_account_unverified");
  if(stripe.qaSigningSecretConfigured!==true || stripe.qaSigningSecretBindingVerified!==true || stripe.signingSecretValueRead!==false) fail("stripe_qa_signing_binding_unverified");
  const previous=stripe.existingEndpoint;
  if(previous && (previous.status!=="disabled" && !(previous.status==="enabled" && previous.verifiedQaDeploymentId===deployment.id && previous.mode==="TEST" && previous.providerReadback===true))) fail("existing_webhook_must_remain_safe");
  return {readyToConfigureTestWebhook:problems.length===0,blockers:problems,formalGateAccepted:false,providerDeliveryVerified:false};
}
export { evaluatePhase2QaWebhookPreflight };
