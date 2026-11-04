import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyBIL02Evidence } from '../../scripts/release/verify-g1-bil02-evidence.mjs';

// In-memory synthetic data ONLY: never store in the enterprise evidence vault.
const BASE = 'a'.repeat(40), RELEASE = 'b'.repeat(40), HASH = 'c'.repeat(64);
const EVENT = 'evt_AbC123456789', DEPLOY = 'dpl_AbC12345';
const ciChecks = ['signatureValid','signatureInvalid','duplicateDelivery','durableEventLedger'];
function example() {
  return {
    schema:'risck-comply.g1-bil02-signed-test-webhook.v1',subject:'BIL-02',gateId:'A-10',
    sourceBaselineSha:BASE,observedAt:'2026-11-04T08:00:00Z',release:{gitSha:RELEASE},
    stripe:{accountId:'acct_Abc123456789',mode:'TEST',livemode:false,eventId:EVENT,
      eventType:'checkout.session.completed',readFromStripeApi:true,providerEventReadbackSha256:HASH,
      providerEventObservedAt:'2026-11-04T08:00:00Z'},
    qaDeployment:{environment:'qa',vercelProjectId:'prj_APpXAyQFy1Gie50xfbO45zjkyUSm',
      deploymentId:DEPLOY,readyState:'READY',gitSha:RELEASE,supabaseProjectRef:'zrxrrfbllsxtleyxjpsz',
      sourceAttested:true,deploymentReadbackSha256:HASH},
    webhookEndpoint:{id:'we_Abc12345678',enabled:true,mode:'TEST',qaDeploymentId:DEPLOY,
      destinationVerified:true,destinationEnv:'qa',providerEndpointReadbackSha256:HASH},
    deliveries:{
      validSignature:{eventId:EVENT,signatureVerified:true,httpStatus:200,appTraceSha256:HASH,
        providerDeliveryReadbackSha256:HASH,signatureHeaderRedacted:true,providerAttemptRef:'first'},
      invalidSignature:{eventId:EVENT,httpStatus:400,signatureRejected:true,persistentEventCreated:false,
        negativeTestTraceSha256:HASH,signatureHeaderRedacted:true},
      duplicateReplay:{eventId:EVENT,httpStatus:200,recognizedAsDuplicate:true,
        appTraceSha256:HASH,providerAttemptRef:'replay'},
    },
    durableDatabase:{projectRef:'zrxrrfbllsxtleyxjpsz',eventId:EVENT,eventRows:1,
      processedEventRows:1,duplicateSideEffects:0,readonlyQuerySha256:HASH,
      providerReadbackSha256:HASH,productionDataRead:false,productionWritten:false},
    ci:{gitSha:RELEASE,conclusion:'success',provider:'circleci',runId:123,runArtifactSha256:HASH,
      tests:Object.fromEntries(ciChecks.map(k=>[k,{result:'PASS',gitSha:RELEASE,logSha256:HASH}]))},
    independentReview:{gitSha:RELEASE,approved:true,qualified:true,githubReviewId:100,
      reviewerLogin:'separate-qualified-reviewer',sourcePrAuthorLogin:'repo-author',sourcePrNumber:2598,approvedAt:'2026-11-04T08:00:00Z',reviewReadbackSha256:HASH},
    secretValuesIncluded:false,productionWrites:false,stripeLiveWrites:false,qaTenantIsolationVerified:true,
  };
}
function denial(name,change,reason){test(name,()=>{const p=example();change(p);assert.ok(verifyBIL02Evidence(p,BASE).some(s=>s.includes(reason)));});}
test('fully populated synthetic structure passes only a pure verifier; not provider acceptance',()=>assert.deepEqual(verifyBIL02Evidence(example(),BASE),[]));
denial('rejects missing proof',p=>{p.schema='preview.report'},'schema/subject');
denial('rejects unrelated source baseline',p=>{p.sourceBaselineSha='x'.repeat(40)},'source baseline');
denial('rejects missing exact SHA',p=>{p.release.gitSha='main'},'source SHA');
denial('rejects LIVE event masquerading as TEST',p=>{p.stripe.livemode=true},'Stripe TEST');
denial('rejects unsupported Stripe event type',p=>{p.stripe.eventType='account.updated'},'Stripe TEST');
denial('rejects missing provider event readback',p=>{p.stripe.providerEventReadbackSha256='pending'},'Stripe TEST');
denial('rejects QA deployment without exact SHA',p=>{p.qaDeployment.gitSha='d'.repeat(40)},'exact-SHA QA');
denial('rejects READY deployment without attributable source',p=>{p.qaDeployment.sourceAttested=false},'exact-SHA QA');
denial('rejects production DB mistaken for QA',p=>{p.qaDeployment.supabaseProjectRef='tganhbbhfxcpblmgqprg'},'exact-SHA QA');
denial('rejects disabled Stripe TEST webhook',p=>{p.webhookEndpoint.enabled=false},'enabled TEST');
denial('rejects webhook targeting old deployment',p=>{p.webhookEndpoint.qaDeploymentId='dpl_Old123456'},'enabled TEST');
denial('rejects fake signature acceptance',p=>{p.deliveries.invalidSignature.httpStatus=200},'invalid signature');
denial('rejects invalid request that created event row',p=>{p.deliveries.invalidSignature.persistentEventCreated=true},'invalid signature');
denial('rejects accepted unsigned delivery',p=>{p.deliveries.validSignature.signatureVerified=false},'genuine signed');
denial('rejects false replay report',p=>{p.deliveries.duplicateReplay.recognizedAsDuplicate=false},'duplicate-delivery');
denial('rejects duplicate attempt same as original',p=>{p.deliveries.duplicateReplay.providerAttemptRef='first'},'duplicate-delivery');
denial('rejects duplicate durable event rows',p=>{p.durableDatabase.eventRows=2},'durable QA');
denial('rejects replay side effects',p=>{p.durableDatabase.duplicateSideEffects=1},'durable QA');
denial('rejects CI with stale SHA',p=>{p.ci.gitSha='f'.repeat(40)},'source-exact CI');
denial('rejects missing negative CI test',p=>{delete p.ci.tests.signatureInvalid},'signatureInvalid');
denial('rejects reviewer without approval',p=>{p.independentReview.approved=false},'qualified independent');
denial('rejects reviewer without native review readback',p=>{p.independentReview.githubReviewId=0},'qualified independent');
denial('rejects exposed secret values',p=>{p.secretValuesIncluded=true},'secret/production');
denial('rejects use of production writes',p=>{p.productionWrites=true},'secret/production');
denial('rejects absent tenant isolation',p=>{p.qaTenantIsolationVerified=false},'secret/production');
denial('rejects self-review from the PR author',p=>{p.independentReview.reviewerLogin='repo-author'},'qualified independent');
