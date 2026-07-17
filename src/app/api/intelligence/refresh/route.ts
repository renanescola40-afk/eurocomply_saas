import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

const METHOD_NOT_ALLOWED_HEADERS = { Allow: 'POST' };

type IntelligenceRefreshPayload = {
  external_id: string;
  title: string;
  category: string;
  jurisdiction: string;
  source_name: string;
  source_type: 'official' | 'regulator' | 'institution' | 'technical_observatory' | 'licensed_media' | 'media_reference';
  author: string;
  published_at: string;
  reliability: 'high' | 'medium' | 'low';
  impact: 'monitor' | 'medium' | 'high' | 'critical';
  executive_summary: string;
  internal_analysis: string;
  affected_companies: string[];
  recommended_actions: string[];
  reference_label: string;
  content_rights: 'official_open' | 'licensed_full_text' | 'metadata_and_analysis_only';
  full_text_allowed: boolean;
  premium: boolean;
  status: 'draft' | 'published' | 'archived';
};

function buildMaintenanceItem(): IntelligenceRefreshPayload {
  return {
    external_id: 'risck-comply-intelligence-maintenance',
    title: 'RISCK COMPLY Intelligence: monitoramento editorial ativo',
    category: 'Operação do Jornal IA',
    jurisdiction: 'União Europeia',
    source_name: 'RISCK COMPLY Intelligence Desk',
    source_type: 'technical_observatory',
    author: 'RISCK COMPLY Intelligence Desk',
    published_at: new Date().toISOString(),
    reliability: 'medium',
    impact: 'monitor',
    executive_summary: 'Registro técnico usado para validar que o fluxo de atualização do Jornal IA está operacional sem copiar conteúdo protegido de terceiros.',
    internal_analysis: 'A rota de atualização está ativa e protegida por segredo. A ingestão real deve manter a política editorial: metadados, referência e análise própria para mídia comum; texto completo apenas para fontes oficiais, abertas ou licenciadas.',
    affected_companies: ['Compliance', 'Legal', 'Risk management'],
    recommended_actions: ['Validar fontes oficiais.', 'Revisar direitos de conteúdo.', 'Confirmar sugestões de calendário antes de criar obrigações.'],
    reference_label: 'RISCK COMPLY internal refresh check',
    content_rights: 'metadata_and_analysis_only',
    full_text_allowed: false,
    premium: false,
    status: 'published',
  };
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforceInternalAuthenticationRateLimit(request, {
    route: '/api/intelligence/refresh',
    action: 'intelligence_refresh_auth',
  });

  if (rateLimitResponse) return rateLimitResponse;

  if (!isAuthorizedInternalCronRequest(request)) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = tryCreateAdminClient();

  if (!supabase) {
    return noStoreJson({ ok: false, error: 'Supabase admin client is not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('intelligence_items')
    .upsert(buildMaintenanceItem(), { onConflict: 'external_id' })
    .select('external_id,title,updated_at');

  if (error) {
    console.error('[intelligence:refresh] upsert failed', { code: error.code ?? 'unknown' });
    return noStoreJson({ ok: false, error: 'Unable to refresh intelligence items' }, { status: 500 });
  }

  return noStoreJson({ ok: true, processed: data?.length ?? 0, items: data ?? [] });
}

export async function GET() {
  return noStoreJson(
    { error: 'method_not_allowed' },
    { status: 405, headers: METHOD_NOT_ALLOWED_HEADERS },
  );
}
