import { createHash, randomBytes } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

function digest(value: string) { return createHash('sha256').update(value).digest('hex'); }
function fail(area: string, error?: { code?: string } | null): never {
  console.warn('[qualified-reviewer-portal] storage_failure', { area, code: error?.code ?? 'unknown' });
  throw new Error('qualified_reviewer_portal_unavailable');
}

export async function createReviewerInvite(input: { organizationId: string; assignmentId: string; reviewerId: string; actorUserId: string; expiresAt: string }) {
  const db = createAdminClient();
  const token = randomBytes(32).toString('hex');
  const tokenHash = digest(token);
  const { data, error } = await db.from('qualified_reviewer_invites').upsert({
    organization_id: input.organizationId,
    assignment_id: input.assignmentId,
    reviewer_id: input.reviewerId,
    token_hash: tokenHash,
    invited_by: input.actorUserId,
    expires_at: input.expiresAt,
    accepted_at: null,
    revoked_at: null,
  }, { onConflict: 'assignment_id,reviewer_id' }).select('id,assignment_id,reviewer_id,expires_at').single();
  if (error || !data) fail('invite_create', error);
  return { invite: data, token };
}

export async function acceptReviewerInvite(token: string) {
  const db = createAdminClient();
  const sessionToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db.rpc('accept_qualified_reviewer_invite', {
    p_token_hash: digest(token),
    p_session_hash: digest(sessionToken),
    p_session_expires_at: expiresAt,
  });
  if (error || !Array.isArray(data) || !data[0]) fail('invite_accept', error);
  return { sessionToken, expiresAt, context: data[0] };
}

export async function getReviewerSession(sessionToken: string) {
  const db = createAdminClient();
  const { data: session, error } = await db.from('qualified_reviewer_sessions')
    .select('id,organization_id,assignment_id,reviewer_id,expires_at,revoked_at')
    .eq('session_hash', digest(sessionToken)).maybeSingle();
  if (error) fail('session_lookup', error);
  if (!session || session.revoked_at || new Date(session.expires_at) <= new Date()) return null;
  const [assignment, reviewer, submissions, attestation] = await Promise.all([
    db.from('qualified_review_assignments').select('id,campaign_id,workstream_id,status,due_at,version').eq('id', session.assignment_id).eq('organization_id', session.organization_id).single(),
    db.from('qualified_reviewers').select('id,display_name,qualification_summary,independence_declared,conflict_details,verified_at,active').eq('id', session.reviewer_id).eq('organization_id', session.organization_id).single(),
    db.from('qualified_review_submissions').select('id,target_sha,opinion,conclusion,scope,evidence_locations,limitations,valid_until,submitted_at,superseded_at').eq('assignment_id', session.assignment_id).eq('organization_id', session.organization_id).order('submitted_at', { ascending: false }),
    db.from('qualified_reviewer_attestations').select('*').eq('assignment_id', session.assignment_id).eq('reviewer_id', session.reviewer_id).maybeSingle(),
  ]);
  for (const [area, result] of [['assignment', assignment], ['reviewer', reviewer], ['submissions', submissions], ['attestation', attestation]] as const) if (result.error) fail(area, result.error);
  await db.from('qualified_reviewer_sessions').update({ last_seen_at: new Date().toISOString() }).eq('id', session.id);
  return { session, assignment: assignment.data, reviewer: reviewer.data, submissions: submissions.data ?? [], attestation: attestation.data };
}

export async function saveReviewerAttestation(input: { sessionToken: string; independenceConfirmed: boolean; conflictDetails?: string | null; scopeAcknowledged: boolean }) {
  const context = await getReviewerSession(input.sessionToken);
  if (!context) throw new Error('reviewer_session_invalid');
  const payload = { assignmentId: context.assignment.id, reviewerId: context.reviewer.id, independenceConfirmed: input.independenceConfirmed, conflictDetails: input.conflictDetails ?? null, scopeAcknowledged: input.scopeAcknowledged };
  const db = createAdminClient();
  const { data, error } = await db.from('qualified_reviewer_attestations').upsert({
    organization_id: context.session.organization_id,
    assignment_id: context.assignment.id,
    reviewer_id: context.reviewer.id,
    independence_confirmed: input.independenceConfirmed,
    conflict_details: input.conflictDetails ?? null,
    scope_acknowledged: input.scopeAcknowledged,
    attestation_digest: digest(JSON.stringify(payload)),
    attested_at: new Date().toISOString(),
  }, { onConflict: 'assignment_id,reviewer_id' }).select('*').single();
  if (error || !data) fail('attestation_save', error);
  return data;
}

export async function revokeReviewerSession(sessionToken: string) {
  const db = createAdminClient();
  const { error } = await db.from('qualified_reviewer_sessions').update({ revoked_at: new Date().toISOString() }).eq('session_hash', digest(sessionToken));
  if (error) fail('session_revoke', error);
}
