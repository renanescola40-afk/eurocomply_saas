# RISCK COMPLY Sales Console Implementation Plan

Status: implementation plan only  
Owner: Product Engineering / Revenue Operations  
Scope: Early Access internal lead operations  
Last reviewed: 2026-07-01

## 1. Diagnostico atual

RISCK COMPLY ja tem uma base correta para captura publica de leads B2B, mas ainda nao tem uma superficie interna para operar esses leads depois da submissao.

O estado atual e lead intake, nao CRM. Isso e o caminho certo para Early Access: o produto principal continua focado em AI compliance, AI governance, EU AI Act readiness, inventario de IA, riscos, documentos, evidencias, tarefas, vendors, billing, organizacoes e audit logs.

Decisao: criar um mini console interno chamado **Sales Console** ou **Lead Operations**. Nao criar nem vender como CRM enterprise.

Principais achados:

- `sales_leads` existe, tem RLS ativo e nao cria politicas publicas.
- `/api/leads` ja aplica rate limit, body limit, JSON validation, consent validation, Supabase service role insert e `no-store`.
- O formulario publico de demo ja captura campos bons para qualificacao inicial.
- `docs/sales` ja define posicionamento, assets comerciais e guardrails de claims.
- A arquitetura principal ja possui organizations, organization_members, RBAC, billing, dashboard protegido, RLS, API guards, rate limit e audit log.
- Ainda falta uma boundary clara de platform/internal admin para Sales Console.
- O modelo atual de leads e simples demais para follow-up: faltam prioridade, owner, proximo follow-up, notas separadas e atividade comercial.

## 2. O que ja existe

### Tabela `sales_leads`

Arquivo: `supabase/migrations/20260627090000_sales_leads.sql`

Campos atuais relevantes:

- `id`
- `created_at`
- `full_name`
- `work_email`
- `company_name`
- `role`
- `company_size`
- `region`
- `compliance_drivers`
- `timeline`
- `current_process`
- `message`
- `source`
- `locale`
- `consent_to_contact`
- `user_agent`
- `ip_hint`
- `status`
- `notes`

Indices atuais:

- `sales_leads_created_at_idx`
- `sales_leads_work_email_idx`
- `sales_leads_status_idx`

### Rota `/api/leads`

Arquivo: `src/app/api/leads/route.ts`

Controles existentes:

- `runtime = 'nodejs'`
- `dynamic = 'force-dynamic'`
- rate limit por IP
- limite de 5 requests por minuto
- failure mode fechado no rate limit
- body JSON limitado a 16 KB
- content type JSON obrigatorio
- validacao de nome, email profissional, empresa e consentimento
- normalizacao simples de strings
- insert server-side com Supabase admin client
- webhook opcional via env
- respostas com `noStoreJson`
- erros publicos sem detalhes internos

### Formulario publico de demo

Arquivo: `src/components/marketing/book-demo-form.tsx`

O formulario envia para `/api/leads` e captura nome, email, empresa, cargo, tamanho da empresa, regiao, drivers de compliance, timeline, processo atual, mensagem, consentimento, source e locale.

### Docs comerciais

Arquivo: `docs/sales/README.md`

Ja existe uma base GTM com playbook, demo script, pitch deck, one-pager, FAQ, comparativo, ROI calculator, discovery checklist e outbound sequences. Tambem existem guardrails para nao prometer compliance garantido, legal advice ou certificacoes sem evidencia.

### Arquitetura principal

Arquivos relevantes:

- `supabase/migrations/20260605190000_organizations.sql`
- `supabase/migrations/20260605190100_organization_members.sql`
- `supabase/migrations/20260605190200_audit_logs.sql`
- `src/server/security/rbac.ts`
- `src/server/security/api-guards.ts`
- `src/lib/security/audit-log.ts`
- `src/app/[locale]/dashboard/organizations/page.tsx`

O produto principal ja usa tenant boundary por organization, membership por `organization_members`, RBAC, dashboard com `noStore()`, API guards e audit logging.

## 3. O que falta

- Pagina interna protegida para lista de leads.
- Pagina interna protegida para detalhe do lead.
- Guard dedicado para platform/internal admin.
- Campos operacionais: prioridade, proximo follow-up, owner, ultimo contacto, ultimo evento.
- Notas internas em tabela propria.
- Activity log comercial.
- Filtros por status, source, timeline, company size e data.
- Testes para bloquear usuarios normais.
- Atualizacao de privacy/data inventory para leads e notas comerciais.

## 4. Escopo MVP

Incluir:

- Pagina `/admin/sales/leads` protegida.
- Lista de leads.
- Filtros por status, source, timeline, company size e data.
- Busca simples por empresa ou email com limite de tamanho.
- Pagina `/admin/sales/leads/[id]` protegida.
- Atualizacao de status.
- Atualizacao de prioridade.
- Proximo follow-up.
- Notas internas.
- Historico basico de atividades comerciais.
- Protecao por platform/internal admin role.
- `no-store` em dados sensiveis.
- Activity/audit event para alteracoes importantes.

Linguagem recomendada:

- Sales Console
- Lead Operations
- Demo Pipeline
- Early Access Pipeline

Evitar:

- CRM enterprise
- Salesforce interno
- marketing automation suite
- full sales platform

## 5. Escopo fora do MVP

Nao implementar agora:

- email marketing completo
- sequencias automaticas complexas
- forecast avancado
- CRM multi-tenant para clientes
- integracao pesada com Salesforce ou HubSpot
- automacao de outbound
- lead scoring com IA
- enrichment externo pago
- pipelines customizaveis
- dashboards de quota
- import/export em massa
- dependencias novas desnecessarias

## 6. Modelo de dados recomendado

### Evoluir `sales_leads`

Adicionar numa migration pequena:

- `priority text default 'normal'`
- `owner_user_id uuid null`
- `next_follow_up_at timestamptz null`
- `last_contacted_at timestamptz null`
- `last_activity_at timestamptz null`
- `updated_at timestamptz default now()`
- `updated_by uuid null`
- `lost_reason text null`
- `disqualified_reason text null`
- `gdpr_deleted_at timestamptz null`

Status recomendados:

- `new`
- `qualified`
- `contacted`
- `demo_scheduled`
- `trial_started`
- `customer`
- `lost`
- `disqualified`

Prioridades recomendadas:

- `low`
- `normal`
- `high`
- `urgent`

Indices recomendados:

- `source`
- `timeline`
- `company_size`
- `next_follow_up_at`
- `priority`
- `last_activity_at`

### Criar `platform_admin_users`

Objetivo: separar admins internos de roles de organizacoes/clientes.

Campos recomendados:

- `user_id uuid primary key`
- `role text`
- `enabled boolean default true`
- `created_at timestamptz default now()`
- `created_by uuid null`

Roles iniciais:

- `owner`
- `sales_admin`
- `sales_rep`
- `support_admin`

Para MVP, permitir Sales Console apenas para `owner` e `sales_admin`.

### Criar `sales_lead_notes`

Campos recomendados:

- `id uuid primary key`
- `lead_id uuid references sales_leads(id)`
- `created_by uuid null`
- `body text not null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### Criar `sales_lead_activity_events`

Campos recomendados:

- `id uuid primary key`
- `lead_id uuid references sales_leads(id)`
- `actor_user_id uuid null`
- `action text not null`
- `previous_value jsonb null`
- `next_value jsonb null`
- `metadata jsonb default '{}'`
- `created_at timestamptz default now()`

Acoes recomendadas:

- `sales_lead.created`
- `sales_lead.status_changed`
- `sales_lead.priority_changed`
- `sales_lead.follow_up_changed`
- `sales_lead.note_created`
- `sales_lead.owner_changed`
- `sales_lead.redacted`

Todas as novas tabelas devem ter RLS ativo e nao devem ter policies publicas no MVP.

## 7. Rotas e paginas recomendadas

### Paginas

- `src/app/admin/sales/leads/page.tsx`
  - server component
  - chama `noStore()`
  - exige usuario autenticado
  - exige platform admin
  - le leads filtrados via server query

- `src/app/admin/sales/leads/[id]/page.tsx`
  - server component
  - chama `noStore()`
  - exige usuario autenticado
  - exige platform admin
  - le lead, notas e atividades

### Server actions

Criar `src/server/actions/sales-leads.ts` com:

- `updateSalesLeadStatusAction`
- `updateSalesLeadPriorityAction`
- `updateSalesLeadFollowUpAction`
- `createSalesLeadNoteAction`

Cada action deve autenticar, validar platform admin, validar input, exigir trusted origin, aplicar rate limit, gravar activity event e retornar erro seguro.

### Queries

Criar `src/server/queries/sales-leads.ts` com:

- `listSalesLeads(filters)`
- `getSalesLeadDetail(id)`
- `listSalesLeadNotes(leadId)`
- `listSalesLeadActivityEvents(leadId)`

### Guard

Criar `src/server/security/platform-admin.ts` com:

- `getPlatformAdminMembership(userId)`
- `requirePlatformAdmin(userId, allowedRoles?)`
- `assertPlatformAdminRole(...)`

Nao reutilizar organization RBAC para Sales Console.

## 8. Seguranca e permissoes

- Autenticacao obrigatoria.
- Platform/internal admin obrigatorio.
- Nao autorizar via organization membership.
- Nao expor links do Sales Console na navegacao de clientes.
- Usar `noStore()` nas paginas internas.
- Usar `noStoreJson()` se houver route handlers internos.
- Mutacoes devem exigir trusted origin.
- Mutacoes devem ter rate limit.
- Inputs devem ser schema-validated e length-limited.
- Nao logar payload completo do lead.
- Nao expor detalhes internos em erros.
- Nao permitir leitura client-side/publica de `sales_leads`.
- Manter RLS ativo.

## 9. RLS e tenant/admin boundaries

Nao adicionar `organization_id` em `sales_leads` para o MVP. Leads sao prospects/pre-clientes e nao devem herdar permissao de tenant.

Regras:

- Customer org role nao concede acesso ao Sales Console.
- Sales Console nao deve aparecer no dashboard de cliente.
- `sales_leads`, `sales_lead_notes`, `sales_lead_activity_events` e `platform_admin_users` ficam com RLS ativo.
- Nao criar policy `authenticated can select`.
- Leituras/escritas passam pelo servidor com admin client apos guard interno.
- Se futuramente houver RLS direto, criar helper proprio de platform admin, sem depender de `organization_members`.

## 10. GDPR e privacy considerations

Lead records contem dados pessoais de contacto comercial e possivelmente dados pessoais em campos livres. Notas internas tambem podem conter dados pessoais.

Regras MVP:

- Manter consentimento obrigatorio na captura publica.
- Minimizar campos coletados.
- Nao mostrar `ip_hint` amplamente na UI.
- Adicionar aviso nas notas internas para evitar dados desnecessarios ou sensiveis.
- Atualizar `docs/privacy/DATA_INVENTORY.md` com sales leads, notes e activity events.
- Definir retencao para leads inativos, por exemplo revisao ou anonimizacao em 12-18 meses.
- Incluir leads em export/delete process por email quando aplicavel.
- Preservar integridade de activity history quando houver redacao aprovada.
- Se webhook estiver ativo, tratar como transferencia para processor/subprocessor.

## 11. Testes necessarios

### Unit tests

- `src/server/security/platform-admin.test.ts`
  - usuario anonimo negado
  - usuario normal negado
  - admin desativado negado
  - admin ativo permitido
  - filtro por role funciona

- `src/server/queries/sales-leads.test.ts`
  - filtros seguros
  - limite de paginacao
  - busca com tamanho limitado
  - erro de query nao vaza detalhes

- `src/server/actions/sales-leads.test.ts`
  - usuario normal nao altera lead
  - platform admin altera status
  - status invalido rejeitado
  - nota com tamanho excessivo rejeitada
  - mutation grava activity event
  - trusted origin obrigatorio

### Page/route tests

- `/admin/sales/leads` nega anonimos.
- `/admin/sales/leads` nega usuarios nao internos.
- `/admin/sales/leads` usa no-store.
- detalhe de lead nega usuarios nao internos.
- detalhe renderiza notas e atividades apenas para admins internos.

### Regressao

- manter testes de `/api/leads`
- manter scripts de RLS/security
- manter lint/typecheck/build verdes

## 12. Plano de implementacao em fases

### Phase 0 - Decision record

- Adicionar este plano.
- Nao mudar runtime.
- Nao alterar produto principal.

### Phase 1 - Database foundation

- Criar migration do Sales Console MVP.
- Adicionar novas tabelas e colunas.
- Manter RLS ativo sem policies publicas.
- Atualizar data inventory.

### Phase 2 - Internal admin boundary

- Criar `platform-admin.ts`.
- Adicionar testes do guard.
- Separar de organization RBAC.

### Phase 3 - Queries e actions

- Criar queries server-side.
- Criar server actions.
- Validar inputs.
- Escrever activity events.
- Usar no-store, trusted mutation e rate limit existentes.

### Phase 4 - UI interna

- Criar pagina de lista.
- Criar pagina de detalhe.
- Usar visual premium dark enterprise.
- Nao adicionar link no customer dashboard.

### Phase 5 - Quality gate

Rodar antes do merge:

- `npm run lint`
- `npm run typecheck`, se existir
- testes direcionados
- `npm run build`

### Phase 6 - Rollout operacional

- Seed controlado do primeiro platform admin.
- Verificar lead real no console.
- Verificar bloqueio para usuario normal.
- Verificar activity event em mutation.
- Verificar que leads nao aparecem no dashboard de cliente.

## 13. Criterios de aceite

- `/api/leads` continua passando testes existentes.
- Formulario publico continua submetendo lead valido.
- `sales_leads` segue sem leitura publica/client-side.
- `/admin/sales/leads` nega anonimos.
- `/admin/sales/leads` nega usuarios autenticados normais.
- Platform admin ve lista de leads.
- Platform admin filtra por status, source, timeline, company size e data.
- Platform admin abre detalhe do lead.
- Platform admin altera status.
- Platform admin define prioridade.
- Platform admin define proximo follow-up.
- Platform admin cria nota interna.
- Mutacoes importantes geram activity event.
- Paginas sensiveis usam no-store.
- Dados de leads nao aparecem no tenant dashboard.
- Nenhuma dependencia pesada nova e adicionada.
- Build, lint e testes ficam verdes.
- Linguagem do produto usa Sales Console/Lead Operations, nao CRM enterprise.

## Arquivos para criar ou alterar na proxima etapa

### Criar

1. `supabase/migrations/<timestamp>_sales_console_mvp.sql`
2. `src/server/security/platform-admin.ts`
3. `src/server/security/platform-admin.test.ts`
4. `src/server/queries/sales-leads.ts`
5. `src/server/queries/sales-leads.test.ts`
6. `src/server/actions/sales-leads.ts`
7. `src/server/actions/sales-leads.test.ts`
8. `src/app/admin/sales/leads/page.tsx`
9. `src/app/admin/sales/leads/[id]/page.tsx`

### Alterar

1. `docs/privacy/DATA_INVENTORY.md`
   - adicionar sales leads, notes e activity events.
2. `docs/sales/README.md`
   - adicionar nota interna: Sales Console e ferramenta do time RISCK COMPLY, nao CRM customer-facing.
3. `src/app/api/leads/route.test.ts`
   - manter regressao e adicionar cobertura se defaults novos afetarem intake.
4. `src/app/api/leads/route.ts`
   - opcional; tocar apenas se for necessario dedupe ou `last_activity_at` na criacao.

## Decisao final

Criar um **Sales Console** interno e pequeno para Early Access. Nao construir CRM enterprise. O objetivo e controlar leads B2B de demo com seguranca, privacidade, no-store, RLS e separacao clara entre operacao interna e produto vendido ao cliente.
