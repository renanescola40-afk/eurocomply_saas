/**
 * #2764 trusted transaction candidate. NOT wired to a public route.
 *
 * The transport/driver must be independently reviewed: verify Supabase's signed
 * JWT and live identity, bind the original verified claims to a single private
 * SERIALIZABLE PostgreSQL transaction, and commit only after the callback
 * completes; any throw MUST roll back. Never run this with browser credentials,
 * user-selected claims, a pooled REST sequence, or a service key in Netlify.
 * No approved concrete transport exists yet. This module confers no access.
 */
import { randomUUID } from 'crypto';
import { aiSystemBodySchema, asText, classifyParsedAiSystemBody } from '@/server/ai-governance/system-payload';
import { buildAuditChainRecord, canonicalizeAuditTimestamp } from '@/server/security/audit-chain';
import { extractTrustedSamlProviderId, filterMembershipsByMandatorySso, type MandatorySsoPolicyRow } from '@/server/security/enterprise-sso-access';

type Row = Record<string, unknown>;
export type TrustedInventorySql = {
  query<T extends Row = Row>(sql: string, params?: readonly unknown[]): Promise<readonly T[]>;
};
/** Internal, reviewed server transport only. It must validate request origin,
 * distributed rate limit, provider signature/expiry and live session; never
 * bind arbitrary client JSON as request.jwt.claims. */
export type VerifiedInventoryTransaction = {
  run<T>(work: (tx: TrustedInventorySql) => Promise<T>): Promise<T>;
};
type Operation =
  | { kind: 'create'; organizationId: string; body: unknown }
  | { kind: 'reassess'; organizationId: string; systemId: string; expectedUpdatedAt: string; body: unknown };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{64}$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
const knownPlans = new Set(['starter', 'professional', 'business', 'enterprise']);

function reject(code: string): never { throw new Error(code); }
function single<T>(rows: readonly T[], code: string): T {
  if (rows.length !== 1) reject(code);
  return rows[0]!;
}
function isRecord(value: unknown): value is Row {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function validUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}
function validTimestamp(value: unknown): value is string {
  return typeof value === 'string' && ISO_TIMESTAMP.test(value) && Number.isFinite(Date.parse(value));
}

export function deriveTrustedInventoryPatch(raw: unknown) {
  // Reject caller-controlled actor/tenant/classification/audit fields rather
  // than treating them as trusted results. Zod still validates original inputs.
  if (!isRecord(raw)) reject('inventory_invalid_input');
  const forbidden = new Set([
    'organizationid','actoruserid','createdby','reassessedby','risklevel',
    'classification','classificationsummary','obligations','nextactions',
    'audit','eventhash','hashsignature','previoushash','plan','entitlements',
  ]);
  if (Object.keys(raw).some(key => forbidden.has(key.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g,'')))) {
    reject('inventory_untrusted_derived_field');
  }
  const body = aiSystemBodySchema.parse(raw);
  const result = classifyParsedAiSystemBody(body);
  return {
    patch: {
      name: body.name, use_case: body.useCase,
      owner_team: asText(body.ownerTeam) || null,
      category: asText(body.category) || null,
      country_market: asText(body.countryMarket) || null,
      processed_data: asText(body.processedData) || null,
      vendor_name: result.vendorName, model_name: asText(body.modelName) || null,
      role: result.role, lifecycle_status: result.lifecycleStatus, risk_domain: result.riskDomain,
      uses_personal_data: result.usesPersonalData, interacts_with_people: result.interactsWithPeople,
      generates_content: result.generatesContent, biometric_identification: result.biometricIdentification,
      manipulative_or_exploitative: result.manipulativeOrExploitative,
      risk_level: result.classification.riskLevel, classification_summary: result.classification.summary,
      obligations: result.classification.obligations, next_actions: result.classification.nextActions,
    },
    roleAssessment: result.roleAssessment,
  };
}

export async function executeTrustedInventoryMutation(transport: VerifiedInventoryTransaction, op: Operation) {
  if (!validUuid(op.organizationId)) reject('inventory_invalid_organization');
  if (op.kind !== 'create' && op.kind !== 'reassess') reject('inventory_invalid_operation');
  if (op.kind === 'reassess' && (!validUuid(op.systemId) || !validTimestamp(op.expectedUpdatedAt))) reject('inventory_invalid_reassessment');
  if (!(process.env.AUDIT_CHAIN_SIGNING_SECRET ?? '').trim()) reject('inventory_audit_signing_unavailable');
  const org = op.organizationId.toLowerCase();
  const derived = deriveTrustedInventoryPatch(op.body);

  return transport.run(async tx => {
    const identity = single(await tx.query(
      "select auth.uid()::text as actor, auth.jwt() as claims, current_setting('transaction_isolation') as isolation",
    ), 'inventory_identity_unavailable');
    if (identity.isolation !== 'serializable' || !validUuid(identity.actor) || !isRecord(identity.claims)
      || identity.claims.sub !== identity.actor || identity.claims.role !== 'authenticated'
      || identity.claims.aal !== 'aal2' || identity.claims.is_anonymous === true
      || !validUuid(identity.claims.session_id)) reject('inventory_identity_denied');
    const actor = identity.actor;

    // Same tenant advisory lock as the existing quota and chained append RPCs.
    // The reviewed driver must surface serialization/lock errors as failures.
    await tx.query('select pg_advisory_xact_lock(hashtext($1::text))', [org]);
    const auth = single(await tx.query(
      'select app_private.qa_require_ai_inventory_actor($1::uuid)::text as actor, app_private.resolve_commercial_plan($1::uuid) as plan',
      [org],
    ), 'inventory_authority_unavailable');
    if (auth.actor !== actor || typeof auth.plan !== 'string' || !knownPlans.has(auth.plan)) reject('inventory_authority_denied');

    const membership = single(await tx.query(
      "select role from public.organization_members where organization_id=$1::uuid and user_id=$2::uuid and status='active' for share",
      [org,actor],
    ), 'inventory_membership_unavailable');
    if (typeof membership.role !== 'string' || !['owner','admin','editor','compliance_manager'].includes(membership.role)) reject('inventory_membership_denied');

    // Read canonical mandatory policy in the same transaction. No missing-schema
    // compatibility fallback here. Use the existing signed AMR SAML policy logic.
    const policies = await tx.query<Row>(
      "select organization_id::text,supabase_provider_id::text,enforce_sso,status,protocol from public.enterprise_identity_connections where organization_id=$1::uuid and enforce_sso=true and status='active' and protocol='saml'",
      [org],
    );
    if (policies.some(row => row.organization_id !== org || row.enforce_sso !== true || row.status !== 'active' || row.protocol !== 'saml')) reject('inventory_sso_policy_invalid');
    const eligible = filterMembershipsByMandatorySso(
      [{ organization_id: org }], [...policies] as MandatorySsoPolicyRow[], extractTrustedSamlProviderId(identity.claims),
    );
    if (eligible.length !== 1) reject('inventory_mandatory_sso_denied');

    // Canonical create RPC enforces quota and inserts history atomically; the
    // table trigger independently protects other writers. Reassess has optimistic
    // version check; the guard above reasserts commercial authority for BOTH.
    const previous = op.kind === 'reassess' ? single(await tx.query(
      'select risk_level,lifecycle_status from public.ai_systems where organization_id=$1::uuid and id=$2::uuid for update',
      [org,op.systemId],
    ), 'inventory_previous_state_unavailable') : null;
    if (previous && (typeof previous.risk_level !== 'string' || typeof previous.lifecycle_status !== 'string')) reject('inventory_previous_state_invalid');
    const payload = JSON.stringify(derived.patch);
    const rows = op.kind === 'create'
      ? await tx.query('select outcome,system from public.create_ai_system_atomic($1::uuid,$2::uuid,$3::jsonb)', [org,actor,payload])
      : await tx.query('select outcome,system from public.reassess_ai_system_atomic($1::uuid,$2::uuid,$3::timestamptz,$4::uuid,$5::jsonb)', [op.systemId,org,op.expectedUpdatedAt,actor,payload]);
    const transition = single(rows, 'inventory_mutation_result_invalid');
    if (transition.outcome !== (op.kind === 'create' ? 'created' : 'updated') || !isRecord(transition.system)) reject('inventory_mutation_denied');
    const system = transition.system;
    if (!validUuid(system.id) || system.organization_id !== org
      || (op.kind === 'create' && system.created_by !== actor)
      || (op.kind === 'reassess' && system.id !== op.systemId.toLowerCase())
      || system.risk_level !== derived.patch.risk_level
      || system.classification_summary !== derived.patch.classification_summary) reject('inventory_mutation_readback_invalid');

    const history = single(await tx.query(
      'select organization_id::text,actor_user_id::text,ai_system_id::text,action,snapshot from public.ai_system_history where organization_id=$1::uuid and ai_system_id=$2::uuid and actor_user_id=$3::uuid and action=$4::text and created_at>=transaction_timestamp()',
      [org,system.id,actor,op.kind === 'create' ? 'created' : 'reassessed'],
    ), 'inventory_history_readback_invalid');
    if (history.organization_id !== org || history.actor_user_id !== actor || history.ai_system_id !== system.id
      || history.action !== (op.kind === 'create' ? 'created' : 'reassessed')
      || !isRecord(history.snapshot) || history.snapshot.riskLevel !== derived.patch.risk_level
      || history.snapshot.lifecycleStatus !== derived.patch.lifecycle_status || history.snapshot.riskDomain !== derived.patch.risk_domain) reject('inventory_history_readback_invalid');

    // Same transaction and same tenant lock: derive audit from trusted result,
    // never from browser actor, event hash, metadata or signature.
    const heads = await tx.query(
      'select event_hash,created_at::text from public.audit_events where organization_id=$1::uuid and event_hash is not null order by created_at desc,id desc limit 1', [org],
    );
    if (heads.length > 1) reject('inventory_audit_head_invalid');
    const head = heads[0];
    if (head && (typeof head.event_hash !== 'string' || !HASH.test(head.event_hash) || typeof head.created_at !== 'string' || !Number.isFinite(Date.parse(head.created_at)))) reject('inventory_audit_head_invalid');
    const clock = single(await tx.query(
      "select to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') as created_at",
    ), 'inventory_audit_clock_unavailable');
    if (!validTimestamp(clock.created_at) || (head && Date.parse(clock.created_at) <= Date.parse(String(head.created_at)))) reject('inventory_audit_clock_conflict');
    const action = op.kind === 'create' ? 'ai_system_created' : 'ai_system_reassessed';
    const audit = buildAuditChainRecord({
      id: randomUUID(), organizationId: org, actorUserId: actor, action,
      entityType: 'ai_system', entityId: system.id, createdAt: clock.created_at,
      metadata: {
        riskLevel: derived.patch.risk_level, lifecycleStatus: derived.patch.lifecycle_status,
        riskDomain: derived.patch.risk_domain, actorRole: membership.role,
        ...(previous ? { previousRiskLevel: previous.risk_level, previousLifecycleStatus: previous.lifecycle_status } : {
          selectedRole: derived.patch.role, recommendedRole: derived.roleAssessment.recommendedRole,
          roleConfidence: derived.roleAssessment.confidence, needsLegalReview: derived.roleAssessment.needsLegalReview,
        }),
      },
    }, head ? String(head.event_hash) : null);
    if (!HASH.test(audit.eventHash) || typeof audit.signature !== 'string' || !HASH.test(audit.signature)) reject('inventory_audit_signing_unavailable');
    const persisted = single(await tx.query(
      'select id::text,organization_id::text,actor_user_id::text,action,entity_type,entity_id,created_at::text,previous_hash,event_hash,hash_signature,hash_algorithm,metadata from public.append_audit_event_chained($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,$6::text,$7::jsonb,$8::timestamptz,$9::text,$10::text,$11::text,$12::text)',
      [audit.id,org,actor,action,'ai_system',system.id,JSON.stringify(audit.metadata),audit.createdAt,audit.previousHash,audit.eventHash,audit.signature,'sha256'],
    ), 'inventory_audit_readback_invalid');
    const metadata = persisted.metadata;
    const expected = audit.metadata as Row;
    if (persisted.id !== audit.id || persisted.organization_id !== org || persisted.actor_user_id !== actor
      || persisted.action !== action || persisted.entity_type !== 'ai_system' || persisted.entity_id !== system.id
      || typeof persisted.created_at !== 'string' || canonicalizeAuditTimestamp(persisted.created_at) !== audit.createdAt
      || persisted.previous_hash !== audit.previousHash || persisted.event_hash !== audit.eventHash
      || persisted.hash_signature !== audit.signature || persisted.hash_algorithm !== 'sha256'
      || !isRecord(metadata) || Object.keys(metadata).length !== Object.keys(expected).length
      || Object.keys(expected).some(key => metadata[key] !== expected[key])) reject('inventory_audit_readback_invalid');
    // Returning success requires the transport to COMMIT successfully. Never
    // catch a failure and perform compensating independent REST writes.
    return { system, roleAssessment: derived.roleAssessment };
  });
}
