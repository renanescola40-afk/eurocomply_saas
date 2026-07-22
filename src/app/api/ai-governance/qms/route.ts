import { z } from 'zod';
import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import { buildAuditRequestContextFromRequest, createAuditEvent } from '@/server/queries/audit-events';
import { approveQmsSystem, createQmsAudit, createQmsControl, createQmsManagementReview, createQmsNonconformity, createQmsSystem, listQmsSnapshot, rollbackQmsCreate } from '@/server/queries/qms-governance';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { parseJsonBodyWithZod, requireApiUser, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

const MAX_BYTES = 96 * 1024;
const workflows = ['system_create','control_create','nonconformity_create','audit_create','management_review_create','system_approve'] as const;
type Workflow = (typeof workflows)[number];
const systemSchema = z.object({ title:z.string().trim().min(3).max(200), scope:z.string().trim().min(20).max(8000), qualityPolicy:z.string().trim().min(20).max(8000), regulatoryStrategy:z.string().trim().min(20).max(8000) });
const controlSchema = z.object({ qmsSystemId:z.string().uuid(), controlCode:z.string().regex(/^QMS-[0-9]{2,3}$/), category:z.enum(['governance','documents','records','design','suppliers','data','risk','monitoring','incidents','change','competence','audit','management_review','corrective_action','regulatory']), title:z.string().trim().min(3).max(240), dueAt:z.string().datetime({offset:true}).nullable().optional() });
const ncSchema = z.object({ qmsSystemId:z.string().uuid(), severity:z.enum(['low','medium','high','critical']), source:z.enum(['internal_audit','management_review','incident','monitoring','complaint','supplier','regulatory','other']), description:z.string().trim().min(10).max(4000), dueAt:z.string().datetime({offset:true}).nullable().optional() });
const auditSchema = z.object({ qmsSystemId:z.string().uuid(), auditType:z.enum(['internal','supplier','process','product','regulatory']), scope:z.string().trim().min(10).max(4000), scheduledAt:z.string().datetime({offset:true}).nullable().optional() });
const reviewSchema = z.object({ qmsSystemId:z.string().uuid(), periodStart:z.string().date(), periodEnd:z.string().date() });
const approveSchema = z.object({ qmsSystemId:z.string().uuid(), expectedUpdatedAt:z.string().datetime({offset:true}), rationale:z.string().trim().min(10).max(4000) });
function workflowOf(request:Request):Workflow|null { const value=new URL(request.url).searchParams.get('workflow'); return workflows.includes(value as Workflow)?value as Workflow:null; }
function denied(result:RateLimitResult){ const retryAfter=Math.max(1,Math.ceil((result.resetAt-Date.now())/1000)); return noStoreJson({error:result.reason?'security_control_unavailable':'rate_limit_exceeded',retryAfter},{status:result.reason?503:429,headers:{'Retry-After':String(retryAfter)}}); }
async function audit(request:Request,input:{organizationId:string;userId:string;role:string;action:string;entityType:string;entityId:string}) { return createAuditEvent({organizationId:input.organizationId,actorUserId:input.userId,action:input.action,entityType:input.entityType,entityId:input.entityId,metadata:{actorRole:input.role},requestContext:buildAuditRequestContextFromRequest(request)}); }

export async function GET(){ try { const user=await requireApiUser(); const organization=await getCurrentOrganizationForUser(user.id); if(!organization)return noStoreJson({error:'organization_required'},{status:403}); const permission=await assertOrganizationPermission({userId:user.id,organizationId:organization.id,permission:'read_ai_governance'}); if(!permission.ok)return permissionDeniedResponse(permission); return noStoreJson({...await listQmsSnapshot(organization.id),role:permission.role}); } catch(error){ return secureApiError(error); } }

export async function POST(request:Request){
  try {
    const originDenied=assertTrustedOrigin(request); if(originDenied)return originDenied;
    const workflow=workflowOf(request); if(!workflow)return noStoreJson({error:'unsupported_workflow'},{status:400});
    const user=await requireApiUser(); const organization=await getCurrentOrganizationForUser(user.id); if(!organization)return noStoreJson({error:'organization_required'},{status:403});
    const permission=await assertOrganizationPermission({userId:user.id,organizationId:organization.id,permission:'manage_ai_governance'}); if(!permission.ok)return permissionDeniedResponse(permission);
    const limit=await checkDistributedRateLimit({key:`qms:${workflow}:${organization.id}:${user.id}`,limit:15,windowMs:60_000}); if(!limit.allowed)return denied(limit);
    let entity:{id:string}|null=null; let table:Parameters<typeof rollbackQmsCreate>[0]|null=null; let action=''; let entityType='';
    if(workflow==='system_create'){ const body=await parseJsonBodyWithZod(request,{schema:systemSchema,maxBytes:MAX_BYTES}); entity=await createQmsSystem({organizationId:organization.id,actorUserId:user.id,...body}); table='ai_qms_systems'; action='qms_system_created'; entityType='ai_qms_system'; }
    else if(workflow==='control_create'){ const body=await parseJsonBodyWithZod(request,{schema:controlSchema,maxBytes:MAX_BYTES}); entity=await createQmsControl({organizationId:organization.id,actorUserId:user.id,...body}); table='ai_qms_controls'; action='qms_control_created'; entityType='ai_qms_control'; }
    else if(workflow==='nonconformity_create'){ const body=await parseJsonBodyWithZod(request,{schema:ncSchema,maxBytes:MAX_BYTES}); entity=await createQmsNonconformity({organizationId:organization.id,actorUserId:user.id,...body}); table='ai_qms_nonconformities'; action='qms_nonconformity_created'; entityType='ai_qms_nonconformity'; }
    else if(workflow==='audit_create'){ const body=await parseJsonBodyWithZod(request,{schema:auditSchema,maxBytes:MAX_BYTES}); entity=await createQmsAudit({organizationId:organization.id,actorUserId:user.id,...body}); table='ai_qms_audits'; action='qms_audit_created'; entityType='ai_qms_audit'; }
    else if(workflow==='management_review_create'){ const body=await parseJsonBodyWithZod(request,{schema:reviewSchema,maxBytes:MAX_BYTES}); entity=await createQmsManagementReview({organizationId:organization.id,actorUserId:user.id,...body}); table='ai_qms_management_reviews'; action='qms_management_review_created'; entityType='ai_qms_management_review'; }
    else { const body=await parseJsonBodyWithZod(request,{schema:approveSchema,maxBytes:MAX_BYTES}); entity=await approveQmsSystem({organizationId:organization.id,actorUserId:user.id,...body}); action='qms_system_approved'; entityType='ai_qms_system'; }
    if(!entity)return noStoreJson({error:'qms_transition_rejected'},{status:409});
    const event=await audit(request,{organizationId:organization.id,userId:user.id,role:permission.role,action,entityType,entityId:entity.id});
    if(!event.persisted){ if(table)await rollbackQmsCreate(table,organization.id,entity.id); return noStoreJson({error:'qms_audit_unavailable'},{status:503}); }
    return noStoreJson({result:entity},{status:workflow.endsWith('_create')?201:200});
  } catch(error){ return secureApiError(error); }
}
