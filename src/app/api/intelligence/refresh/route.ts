import { NextResponse } from 'next/server';

import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { tryCreateAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const maintenanceItem = {
  external_id: 'eurocomply-intelligence-maintenance',
  title: 'EuroComply Intelligence: monitoramento editorial ativo',
  category: 'Operação do Jornal IA',
  jurisdiction: 'União Europeia',
  source_name: 'EuroComply Intelligence Desk',
  source_type: 'technical_observatory',
  author: 'EuroComply Intelligence Desk',
  published_at: new Date().toISOString(),
  reliability: 'medium',
  impact: 'monitor',
  executive_summary: 'Registro técnico usado para validar que o fluxo de atualização do Jornal IA está operacional sem copiar conteúdo protegido de terceiros.',
  internal_analysis: 'A rota de atualização está ativa e protegida por segredo. A ingestão real deve manter a política editorial: metadados, referência e análise própria para mídia comum; texto completo apenas para fontes oficiais, abertas ou licenciadas.',
  affected_companies: ['Compliance', 'Legal', 'Risk management'],
  recommended_actions: ['Validar fontes oficiais.', 'Revisar direitos de conteúdo.', 'Confirmar sugestões de calendário antes de criar obrigações.'],
  reference_label: 'EuroComply internal refresh check',
  content_rights: 'metadata_and_analysis_only',
  full_text_allowed: false,
  premium: false,
  status: 'published',
};

export async function POST(request: Request) {
  if (!isAuthorizedInternalCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = tryCreateAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Supabase admin client is not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('intelligence_items')
    .upsert(maintenanceItem, { onConflict: 'external_id' })
    .select('external_id,title,updated_at');

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, processed: data?.length ?? 0, items: data ?? [] });
}

export async function GET(request: Request) {
  return POST(request);
}
