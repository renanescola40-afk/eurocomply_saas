const {default:pg}=await import(new URL('../../tests/fixtures/p0-postgres-runtime/node_modules/pg/lib/index.js',import.meta.url).href);
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';

// Isolated native PostgreSQL 17. Fixed loopback-only fixture credentials;
// never reads production credentials or accepts a remote/database URL.
const connection = {host:'127.0.0.1',port:5432,user:'risck_synthetic',password:'synthetic-local-only',database:'risck_synthetic',connectionTimeoutMillis:5000,statement_timeout:15000,lock_timeout:10000};
const client = new pg.Client(connection);
await client.connect();
const db = {query:(...args)=>client.query(...args),exec:sql=>client.query(sql),close:()=>client.end()};
const checks = [];
const report = {sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),engine:'native PostgreSQL 17',scope:'synthetic-minimal-schema-multiple-sessions',concurrency:'NOT_TESTED',production:'NOT_TESTED',checks};
const q = async (sql,args=[]) => (await db.query(sql,args)).rows;
const scalar = async (sql,args=[]) => Object.values((await q(sql,args))[0])[0];
async function check(name, fn) { try { await fn(); checks.push({name,status:'PASS'}); console.log('PASS',name); } catch(e) {checks.push({name,status:'FAIL',error:e.message});console.error('FAIL',name,e.message); throw e;} }
const A='10000000-0000-4000-8000-000000000001', B='20000000-0000-4000-8000-000000000001';
const ids = Array.from({length:8},(_,i)=>`30000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const users = Array.from({length:8},(_,i)=>`40000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
async function seed() {
 await db.exec('truncate organization_members,organization_usage,organization_security_settings,enterprise_contracts,organization_entitlements,invitations,audit_events,audit_logs,enterprise_seat_operations;');
 for (const [i,role,tenant,status,seat] of [[0,'owner',A,'active','full'],[1,'owner',A,'active','full'],[2,'admin',A,'active','full'],[3,'viewer',A,'active','viewer'],[4,'editor',A,'active','participant'],[5,'owner',B,'active','full'],[6,'owner',A,'suspended','full'],[7,'compliance_manager',A,'active','full']]) {
   await q('insert into organization_members(id,user_id,role,organization_id,status,seat_type) values($1,$2,$3,$4,$5,$6)',[ids[i],users[i],role,tenant,status,seat]);
 }
 await q('insert into organization_usage(organization_id,active_members,full_users,participants,viewers,active_admins) values($1,6,4,1,1,3),($2,1,1,0,0,1)',[A,B]);
 await q("insert into enterprise_contracts(id,organization_id,status,version,admin_limit) values($1,$2,'active',1,10)",[ids[0],A]);
 await q('insert into organization_entitlements(organization_id,contract_id,admin_limit) values($1,$2,10)',[A,ids[0]]);
 await q("select set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims','{}',false)");
}
async function counters(tenant=A) {
 const a=(await q('select active_members,full_users,participants,viewers,active_admins from organization_usage where organization_id=$1',[tenant]))[0];
 const b=(await q("select count(*) filter(where status='active')::int active_members,count(*) filter(where status='active' and seat_type='full')::int full_users,count(*) filter(where status='active' and seat_type='participant')::int participants,count(*) filter(where status='active' and seat_type='viewer')::int viewers,count(*) filter(where status='active' and role in ('owner','admin'))::int active_admins from organization_members where organization_id=$1",[tenant]))[0];
 assert.deepEqual(a,b);
}
async function snapshot() { return JSON.stringify(await q("select (select jsonb_agg(x order by id) from organization_members x) members,(select jsonb_agg(x order by organization_id) from organization_usage x) usage,(select count(*) from audit_events) events,(select count(*) from audit_logs) logs")); }
async function auditArgs(tenant=A,previous=undefined) {
 const head=previous===undefined? await scalar('select (select event_hash from audit_events where organization_id=$1 order by created_at desc,id desc limit 1)',[tenant]):previous;
 return [randomUUID(),new Date().toISOString(),head,createHash('sha256').update(randomUUID()).digest('hex'),'b'.repeat(64),{}];
}
async function remove(i=3,actor=0,tenant=A,role='viewer',previous=undefined){const args=[tenant,ids[i],users[i],role,users[actor],...await auditArgs(tenant,previous)];return (await q('select * from remove_organization_member_audited_atomic($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',args))[0].outcome;}
async function role(i=3,next='member',actor=0,old='viewer',tenant=A,previous=undefined){const args=[tenant,ids[i],users[i],old,next,users[actor],...await auditArgs(tenant,previous)];return (await q('select * from change_organization_member_role_audited_atomic($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',args))[0].outcome;}
async function seat(i=1,actor=0,source='admin',key=randomUUID(),tenant=A){return (await q('select * from release_organization_seat_atomic($1,$2,$3,$4,$5)',[tenant,ids[i],users[actor],key,source]))[0].outcome;}
async function identity(i,aal='aal1'){await q("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[i===null?'':users[i],JSON.stringify({aal})]);}
try {
 report.postgresVersion = await scalar('select version()');
 const fixtureIdentity=(await q('select current_database() db,current_user usr,inet_server_addr()::text host'))[0];
 assert.equal(fixtureIdentity.db,'risck_synthetic');assert.equal(fixtureIdentity.usr,'risck_synthetic');assert.ok(['127.0.0.1','::1'].includes(fixtureIdentity.host));
 assert.equal(await scalar("select count(*)::int from pg_tables where schemaname='public'"),0,'Fixture database must be empty');
 assert.match(report.postgresVersion,/PostgreSQL 17\./);
 await db.exec(readFileSync('tests/fixtures/p0-postgres/schema.sql','utf8'));
 const baselines=JSON.parse(readFileSync('tests/fixtures/p0-postgres/baseline-functions.json','utf8'));
 for (const f of baselines) {
  await db.exec(f.definition);
  // Reproduce read-only LIVE ACL metadata; pg_get_functiondef excludes grants.
  const schema = f.signature.startsWith('app_private.') ? '' : 'public.';
  await db.exec(`revoke all on function ${schema}${f.signature} from public,anon,authenticated; grant execute on function ${schema}${f.signature} to service_role;`);
  if(f.signature.startsWith('app_private.')) await db.exec(`grant execute on function ${f.signature} to authenticated;`);
 }
 const migrations=['20261015235500_enterprise_private_membership_mfa_gate.sql','20261018023000_guard_last_active_owner_removal.sql','20261018113000_atomic_member_removal_with_chained_audit.sql','20261018160000_atomic_member_role_change_with_chained_audit.sql','20261018183000_guard_last_active_owner_seat_release.sql','20261018190000_reconcile_audited_membership_usage_counters.sql'];
 for(const file of migrations) await check('Compile and apply unmodified migration '+file,async()=>{
   const sql=readFileSync('supabase/migrations/'+file,'utf8');
   await db.exec(sql);
   await q('insert into supabase_migrations.schema_migrations values($1)',[file.split('_')[0]]);
 });
 await seed();
 for(const [name,fn] of [
 ['Remove succeeds with one chain event and one legacy log',async()=>{assert.equal(await remove(),'removed');assert.equal(await scalar('select count(*)::int from audit_events'),1);assert.equal(await scalar('select count(*)::int from audit_logs'),1);await counters();}],
 ['Remove rejects nonmember actor',async()=>assert.equal(await remove(3,5),'permission_denied')],
 ['Remove rejects viewer actor',async()=>assert.equal(await remove(4,3,A,'editor'),'permission_denied')],
 ['Remove rejects cross-tenant target',async()=>assert.equal(await remove(5,0,A,'owner'),'not_found')],
 ['Remove rejects admin targeting owner',async()=>assert.equal(await remove(1,2,A,'owner'),'permission_denied')],
 ['Remove rejects stale expected role',async()=>assert.equal(await remove(3,0,A,'member'),'state_changed')],
 ['Remove rejects self removal',async()=>assert.equal(await remove(0,0,A,'owner'),'invalid_input')],
 ['Remove preserves final active owner with suspended owner present',async()=>{await q("update organization_members set status='suspended' where id=$1",[ids[1]]);assert.equal(await remove(0,2,A,'owner'),'permission_denied');assert.equal(await scalar('select outcome from remove_organization_member_atomic($1,$2,$3,$4)',[A,ids[0],users[0],'owner']),'last_owner');}],
 ['Remove rolls back membership and usage on stale audit head',async()=>{await remove(4,0,A,'editor');const before=await snapshot();await assert.rejects(()=>remove(3,0,A,'viewer',null),/stale head/);assert.equal(await snapshot(),before);}],
 ['Remove rolls back after audit_events insert failure',async()=>{await db.exec("alter table audit_events add constraint synthetic_reject check(action <> 'team.member_removed');");const before=await snapshot();try{await assert.rejects(()=>remove(),/synthetic_reject/);assert.equal(await snapshot(),before);}finally{await db.exec('alter table audit_events drop constraint synthetic_reject');}}],
 ['Role succeeds with atomic audit and reconciled counters',async()=>{assert.equal(await role(3,'admin'),'changed');await counters();assert.equal(await scalar('select count(*)::int from audit_events'),1);assert.equal(await scalar('select count(*)::int from audit_logs'),1);}],
 ['Role rejects cross-tenant actor',async()=>assert.equal(await role(3,'member',5),'permission_denied')],
 ['Role rejects cross-tenant target',async()=>assert.equal(await role(5,'member',0,'owner'),'not_found')],
 ['Role rejects stale expected state',async()=>assert.equal(await role(3,'member',0,'editor'),'state_changed')],
 ['Role rejects admin assigning owner',async()=>assert.equal(await role(3,'owner',2),'permission_denied')],
 ['Role rejects admin changing existing owner',async()=>assert.equal(await role(1,'viewer',2,'owner'),'permission_denied')],
 ['Role enforces admin quota',async()=>{await db.exec('update organization_entitlements set admin_limit=3');assert.equal(await role(3,'admin'),'admin_limit_reached');}],
 ['Role counts pending admin invitations toward quota',async()=>{await db.exec('update organization_entitlements set admin_limit=4');await q("insert into invitations values($1,$2,null,null,now()+interval '1 day','admin')",[randomUUID(),A]);assert.equal(await role(3,'admin'),'admin_limit_reached');}],
 ['Role fails closed without active enterprise contract',async()=>{await db.exec("update enterprise_contracts set status='suspended'");assert.equal(await role(3,'admin'),'contract_not_active');}],
 ['Role preserves final active owner through canonical RPC',async()=>{await q("update organization_members set status='suspended' where id=$1",[ids[1]]);assert.equal(await scalar('select outcome from change_organization_member_role_atomic($1,$2,$3,$4)',[A,ids[0],'owner','viewer']),'last_owner');}],
 ['Role rolls back role and counters on chain CAS failure',async()=>{await remove(4,0,A,'editor');const before=await snapshot();await assert.rejects(()=>role(3,'admin',0,'viewer',A,null),/stale head/);assert.equal(await snapshot(),before);}],
 ['Role rolls back signed event when legacy audit insert fails',async()=>{await db.exec("alter table audit_logs add constraint synthetic_legacy_reject check(action <> 'team_member_role_changed');");const before=await snapshot();try{await assert.rejects(()=>role(3,'admin'),/synthetic_legacy_reject/);assert.equal(await snapshot(),before);}finally{await db.exec('alter table audit_logs drop constraint synthetic_legacy_reject');}}],
 ['Seat suspension allows owner to suspend another owner',async()=>{assert.equal(await seat(),'released');await counters();assert.equal(await scalar('select status from organization_members where id=$1',[ids[1]]),'suspended');}],
 ['SCIM deprovision preserves owner invariant and counters',async()=>{assert.equal(await seat(1,0,'scim'),'released');assert.equal(await scalar('select status from organization_members where id=$1',[ids[1]]),'deprovisioned');await counters();assert.equal(await seat(0,0,'scim'),'last_owner');}],
 ['Seat rejects admin suspending owner',async()=>assert.equal(await seat(0,2),'permission_denied')],
 ['Seat rejects foreign actor suspending owner',async()=>assert.equal(await seat(0,5),'permission_denied')],
 ['Seat release is idempotent',async()=>{const key=randomUUID();assert.equal(await seat(1,0,'admin',key),'released');assert.equal(await seat(1,0,'admin',key),'duplicate');assert.equal(await scalar('select count(*)::int from audit_logs'),1);}],
 ['Seat owner denial leaves idempotency key reusable',async()=>{const key=randomUUID();assert.equal(await seat(1,2,'admin',key),'permission_denied');assert.equal(await seat(1,0,'admin',key),'released');}],
 ['Seat release rolls back usage and membership if audit fails',async()=>{await db.exec("alter table audit_logs add constraint synthetic_seat_reject check(action <> 'enterprise.seat_released');");const before=await snapshot();try{await assert.rejects(()=>seat(),/synthetic_seat_reject/);assert.equal(await snapshot(),before);assert.equal(await scalar('select count(*)::int from enterprise_seat_operations'),0);}finally{await db.exec('alter table audit_logs drop constraint synthetic_seat_reject');}}],
 ]) {await seed();await check(name,fn);}
 for(const enforced of [false,true]) for(const aal of ['aal1','aal2']) for(const i of [0,1,2,3,4,5,6,7,null]) {
  await seed();await q('insert into organization_security_settings values($1,$2)',[A,enforced]);await identity(i,aal);
  await check(`MFA read/manage: enforced=${enforced}, aal=${aal}, actor=${i}`,async()=>{
   const r=(await q('select app_private.enterprise_member_can_read($1) r,app_private.enterprise_member_can_manage($1) m',[A]))[0];
   const active=[0,1,2,3,4,7].includes(i),mfa=!enforced||aal==='aal2';
   assert.equal(r.r,active&&mfa);assert.equal(r.m,[0,1,2,4,7].includes(i)&&mfa);
  });
 }
 await check('Privileged functions reject anon/authenticated through real role EXECUTE checks',async()=>{
  const r=await q("select p.oid::regprocedure::text signature,has_function_privilege('anon',p.oid,'EXECUTE') a,has_function_privilege('authenticated',p.oid,'EXECUTE') u,has_function_privilege('service_role',p.oid,'EXECUTE') s from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('remove_organization_member_audited_atomic','change_organization_member_role_audited_atomic','release_organization_seat_atomic')");
  assert.equal(r.length,3); for(const f of r){assert.equal(f.a,false);assert.equal(f.u,false);assert.equal(f.s,true);}
  await db.exec('set role authenticated');try{await assert.rejects(()=>q('select * from release_organization_seat_atomic(null,null,null,null,null)'),/permission denied/);}finally{await db.exec('reset role');}
 });
 const manual = readFileSync('supabase/reconciliation/20261018223000_reconcile_existing_membership_usage_drift_manual.sql','utf8').replace(/^\\set ON_ERROR_STOP on\s*$/m,'');
 async function manualAttempt(){try{await db.exec(manual);}catch(e){await db.exec('rollback');throw e;}}
 await check('Manual reconciliation rejects absent session authorization',async()=>{await assert.rejects(()=>manualAttempt(),/manual owner authorization/);});
 await q("select set_config('risck.p0f_reconcile_confirmation','APPROVED_MANUAL_P0F_REPAIR',false),set_config('risck.p0f_release_sha',$1,false)",[report.sourceSha]);
 await check('Manual repair rejects execution before legacy writer retirement',async()=>{await assert.rejects(()=>manualAttempt(),/cutover was not accepted/);});
 await check('Role cutover rejects retirement before removal cutover',async()=>{try{await assert.rejects(()=>db.exec(readFileSync('supabase/reconciliation/20261018210000_retire_legacy_member_role_after_cutover.sql','utf8')),/accepted P0-C/);}finally{await db.exec('rollback');}});
 for(const file of ['20261018120000_retire_legacy_member_removal_after_cutover.sql','20261018210000_retire_legacy_member_role_after_cutover.sql']) await check('Apply unmodified manual ACL cutover '+file,async()=>{await db.exec(readFileSync('supabase/reconciliation/'+file,'utf8'));});
 await check('Service role direct legacy mutations denied after cutover',async()=>{await db.exec('set role service_role');try{await assert.rejects(()=>q('select * from remove_organization_member_atomic(null,null,null,null)'),/permission denied/);await assert.rejects(()=>q('select * from change_organization_member_role_atomic(null,null,null,null)'),/permission denied/);}finally{await db.exec('reset role');}});
 await seed();await check('Audited removal still executes as service_role after legacy retirement',async()=>{await db.exec('set role service_role');try{assert.equal(await remove(3,0,A,'viewer',null),'removed');}finally{await db.exec('reset role');}await counters();});
 await seed();await check('Audited role change still executes as service_role after legacy retirement',async()=>{await db.exec('set role service_role');try{assert.equal(await role(3,'admin',0,'viewer',A,null),'changed');}finally{await db.exec('reset role');}await counters();});
 await seed();await check('Manual reconciliation rejects unexpected zero drifting rows',async()=>{await assert.rejects(()=>manualAttempt(),/expected exactly two/);});
 await seed();await db.exec('update organization_usage set active_members=active_members+1');
 await check('Manual reconciliation repairs exactly two synthetic rows and records two logs',async()=>{await manualAttempt();await counters(A);await counters(B);assert.equal(await scalar("select count(*)::int from audit_logs where action='enterprise.membership_usage_reconciled'"),2);});
 await seed();await db.exec('update organization_usage set active_members=active_members+1');
 await check('Manual repair fully rolls back both counters if administrative audit fails',async()=>{await db.exec("alter table audit_logs add constraint synthetic_repair_reject check(action <> 'enterprise.membership_usage_reconciled');");const before=await snapshot();try{await assert.rejects(()=>manualAttempt(),/synthetic_repair_reject/);assert.equal(await snapshot(),before);}finally{await db.exec('alter table audit_logs drop constraint synthetic_repair_reject');}});
 await seed();await check('Admission admits only schema candidate with all six migrations and retired legacy writers',async()=>{await db.exec("do $$ declare t record; begin for t in select tablename from pg_tables where schemaname='public' loop execute format('alter table public.%I enable row level security',t.tablename);execute format('alter table public.%I force row level security',t.tablename);end loop;end $$;");const r=(await q(readFileSync('scripts/supabase/p0-membership-release-admission.sql','utf8')))[0];assert.equal(r.schema_admission,'SCHEMA_CANDIDATE_REQUIRES_RUNTIME_ACCEPTANCE');assert.equal(r.applied_count,6);assert.equal(r.drifted_usage_organizations,0);});
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 async function removeOn(c,i,actor=0,tenant=A,expected='viewer') {return (await c.query('select * from remove_organization_member_audited_atomic($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[tenant,ids[i],users[i],expected,users[actor],...await auditArgs(tenant)])).rows[0].outcome;}
 async function roleOn(c,i,next,actor=0,expected='viewer') {return (await c.query('select * from change_organization_member_role_audited_atomic($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',[A,ids[i],users[i],expected,next,users[actor],...await auditArgs()])).rows[0].outcome;}
 async function seatOn(c,i,actor=0,key=randomUUID(),source='admin'){return (await c.query('select * from release_organization_seat_atomic($1,$2,$3,$4,$5)',[A,ids[i],users[actor],key,source])).rows[0].outcome;}
 async function raceTenant(name,first,second,{firstOutcome,secondOutcome,error,prepare}={}) {
  await seed();if(prepare)await prepare();
  const c1=new pg.Client(connection),c2=new pg.Client(connection);
  await c1.connect();await c2.connect();
  await check(name,async()=>{
   try{
    await c1.query('begin');await c2.query('begin');
    assert.equal(await first(c1),firstOutcome);
    const pid=(await c2.query('select pg_backend_pid() pid')).rows[0].pid;
    let finished=false;
    const pending=second(c2).then(value=>{finished=true;return {value};},failure=>{finished=true;return {failure};});
    let blocked=false;const deadline=Date.now()+5000;
    while(Date.now()<deadline&&!finished){
     const activity=(await q('select wait_event_type from pg_stat_activity where pid=$1',[pid]))[0];
     if(activity?.wait_event_type==='Lock'){blocked=true;break;}
     await pause(20);
    }
    assert.equal(blocked,true,'Competing same-tenant mutation must actually wait on PostgreSQL lock');
    await c1.query('commit');
    const result=await pending;
    if(error){assert.ok(result.failure,'Expected transactional rejection');assert.match(result.failure.message,error);await c2.query('rollback');}
    else {if(result.failure)throw result.failure;assert.equal(result.value,secondOutcome);await c2.query('commit');}
    assert.ok(await scalar("select count(*)::int from organization_members where organization_id=$1 and status='active' and role='owner'",[A])>=1);
    await counters();
   }finally{await c1.query('rollback').catch(()=>{});await c2.query('rollback').catch(()=>{});await c1.end();await c2.end();}
  });
 }
 await raceTenant('Concurrent owner removal then seat suspension preserves final active owner',c=>removeOn(c,1,0,A,'owner'),c=>seatOn(c,0),{firstOutcome:'removed',secondOutcome:'last_owner'});
 await raceTenant('Concurrent owner demotion then SCIM deprovision preserves final active owner',c=>roleOn(c,1,'viewer',0,'owner'),c=>seatOn(c,0,0,randomUUID(),'scim'),{firstOutcome:'changed',secondOutcome:'last_owner'});
 await raceTenant('Concurrent SCIM suspension invalidates subsequent actor role authority',c=>seatOn(c,1,0,randomUUID(),'scim'),c=>roleOn(c,0,'viewer',1,'owner'),{firstOutcome:'released',secondOutcome:'permission_denied'});
 await raceTenant('Concurrent suspension invalidates subsequent actor removal authority',c=>seatOn(c,1),c=>removeOn(c,0,1,A,'owner'),{firstOutcome:'released',secondOutcome:'permission_denied'});
 await raceTenant('Concurrent admin promotions serialize quota and counters',c=>roleOn(c,3,'admin'),c=>roleOn(c,4,'admin',0,'editor'),{firstOutcome:'changed',secondOutcome:'admin_limit_reached',prepare:()=>db.exec('update organization_entitlements set admin_limit=4')});
 await raceTenant('Concurrent signed removals reject stale audit head and roll back second mutation',c=>removeOn(c,4,0,A,'editor'),c=>removeOn(c,3),{firstOutcome:'removed',error:/stale head/});
 await check('Retry after concurrent audit CAS failure removes only intended remaining member',async()=>{assert.equal(await scalar('select count(*)::int from organization_members where id=$1',[ids[3]]),1);assert.equal(await remove(),'removed');await counters();assert.equal(await scalar('select count(*)::int from audit_events'),2);});
 const sharedKey=randomUUID();
 await raceTenant('Concurrent duplicate seat operations serialize and write one audit log',c=>seatOn(c,1,0,sharedKey),c=>seatOn(c,1,0,sharedKey),{firstOutcome:'released',secondOutcome:'duplicate'});
 await check('Concurrent duplicate seat operation produced exactly one durable audit',async()=>assert.equal(await scalar('select count(*)::int from audit_logs'),1));
 await seed();
 await check('Different tenants mutate independently while first tenant transaction holds locks',async()=>{
  const target=randomUUID(),user=randomUUID();
  await q("insert into organization_members(id,organization_id,user_id,role,status,seat_type) values($1,$2,$3,'viewer','active','viewer')",[target,B,user]);
  await q('update organization_usage set active_members=active_members+1,viewers=viewers+1 where organization_id=$1',[B]);
  const c1=new pg.Client(connection),c2=new pg.Client(connection);await c1.connect();await c2.connect();
  try{
   await c1.query('begin');await c2.query('begin');await c2.query("set local lock_timeout='1s'");
   assert.equal(await removeOn(c1,3),'removed');
   const args=[B,target,user,'viewer',users[5],...await auditArgs(B)];
   const r=await c2.query('select * from remove_organization_member_audited_atomic($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',args);
   assert.equal(r.rows[0].outcome,'removed');await c2.query('commit');await c1.query('rollback');
   await counters(A);await counters(B);
  }finally{await c1.query('rollback').catch(()=>{});await c2.query('rollback').catch(()=>{});await c1.end();await c2.end();}
 });
 report.concurrency='PASS_ISOLATED_MULTIPLE_SESSIONS';

 report.result='PASS_ISOLATED_POSTGRES';
} catch(e){report.result='FAIL';report.error={message:e.message,code:e.code};process.exitCode=1;} finally {
 report.passed=checks.filter(x=>x.status==='PASS').length;report.failed=checks.filter(x=>x.status==='FAIL').length;
 mkdirSync('artifacts/p0-postgres',{recursive:true});
 writeFileSync('artifacts/p0-postgres/acceptance.json',JSON.stringify(report,null,2)+'\n');await db.close();
 console.log(JSON.stringify({result:report.result,passed:report.passed,failed:report.failed,error:report.error}));
}
