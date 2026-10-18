-- Synthetic minimal schema: no production rows or credentials.
-- Deliberately not a full Supabase snapshot; excludes unrelated triggers/FKs.
create role anon;
create role authenticated;
create role service_role;
create schema auth;
create schema app_private;
create schema supabase_migrations;
create table supabase_migrations.schema_migrations(version text primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
create table public.organization_members(id uuid primary key,organization_id uuid not null,user_id uuid,role text,status text default 'active',seat_type text default 'full',updated_at timestamptz default now());
create table public.organization_usage(organization_id uuid primary key,active_members int default 0,full_users int default 0,participants int default 0,viewers int default 0,active_admins int default 0,last_reconciled_at timestamptz,updated_at timestamptz default now());
create table public.organization_security_settings(organization_id uuid primary key,require_mfa_for_all_users boolean default false);
create table public.enterprise_contracts(id uuid primary key,organization_id uuid,status text,version int,updated_at timestamptz default now(),admin_limit int);
create table public.organization_entitlements(organization_id uuid primary key,contract_id uuid,admin_limit int);
create table public.invitations(id uuid primary key,organization_id uuid,accepted_at timestamptz,revoked_at timestamptz,expires_at timestamptz,role text);
create table public.audit_events(id uuid primary key,organization_id uuid,actor_user_id uuid,action text,entity_type text,entity_id text,metadata jsonb,created_at timestamptz,previous_hash text,event_hash text,hash_algorithm text,hash_signature text);
create table public.audit_logs(id uuid primary key default gen_random_uuid(),organization_id uuid,actor_user_id uuid,actor_id uuid,action text,entity_type text,entity_id text,metadata jsonb);
create table public.enterprise_seat_operations(id uuid primary key default gen_random_uuid(),organization_id uuid,idempotency_key text,operation text,source text,actor_user_id uuid,outcome text,membership_id uuid,completed_at timestamptz,metadata jsonb,unique(organization_id,idempotency_key));
grant usage on schema public,auth,app_private to anon,authenticated,service_role;
