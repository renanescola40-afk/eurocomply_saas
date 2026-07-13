'use client';

import { useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';

type Locale = 'en' | 'pt' | 'es' | 'fr' | 'it' | 'de';
type Map = Record<string, string>;

const maps: Record<Locale, Map> = {
  pt: {},
  en: {
    'A carregar...': 'Loading...',
    'Inventário de IA': 'AI Inventory',
    'sistemas de IA registados': 'AI systems registered',
    'Exportar CSV': 'Export CSV',
    'Novo Caso': 'New Case',
    'Inaceitável': 'Unacceptable',
    'Alto Risco': 'High Risk',
    'Risco Limitado': 'Limited Risk',
    'Risco Mínimo': 'Minimal Risk',
    'Pesquisar por nome ou fornecedor...': 'Search by name or vendor...',
    'Risco: Todos': 'Risk: All',
    'Dept: Todos': 'Dept: All',
    'Status: Todos': 'Status: All',
    'Em revisão': 'In review',
    'Conforme': 'Compliant',
    'Não conforme': 'Non-compliant',
    'Mitigado': 'Mitigated',
    'Nenhum sistema corresponde aos filtros.': 'No system matches the filters.',
    'Nenhum sistema de IA registado.': 'No AI system registered.',
    'Criar primeiro caso': 'Create first case',
    'Nome': 'Name',
    'Risco': 'Risk',
    'Status': 'Status',
    'Departamento': 'Department',
    'Avaliado em': 'Assessed on',
    'Fornecedor': 'Vendor',
    'Nível de Risco': 'Risk Level',
    'Data da Avaliação': 'Assessment Date',
  },
  es: {
    'A carregar...': 'Cargando...',
    'Inventário de IA': 'Inventario de IA',
    'sistemas de IA registados': 'sistemas de IA registrados',
    'Exportar CSV': 'Exportar CSV',
    'Novo Caso': 'Nuevo caso',
    'Inaceitável': 'Inaceptable',
    'Alto Risco': 'Alto riesgo',
    'Risco Limitado': 'Riesgo limitado',
    'Risco Mínimo': 'Riesgo mínimo',
    'Pesquisar por nome ou fornecedor...': 'Buscar por nombre o proveedor...',
    'Risco: Todos': 'Riesgo: Todos',
    'Dept: Todos': 'Depto: Todos',
    'Status: Todos': 'Estado: Todos',
    'Em revisão': 'En revisión',
    'Conforme': 'Conforme',
    'Não conforme': 'No conforme',
    'Mitigado': 'Mitigado',
    'Nenhum sistema corresponde aos filtros.': 'Ningún sistema coincide con los filtros.',
    'Nenhum sistema de IA registado.': 'No hay ningún sistema de IA registrado.',
    'Criar primeiro caso': 'Crear primer caso',
    'Nome': 'Nombre',
    'Risco': 'Riesgo',
    'Status': 'Estado',
    'Departamento': 'Departamento',
    'Avaliado em': 'Evaluado el',
    'Fornecedor': 'Proveedor',
    'Nível de Risco': 'Nivel de riesgo',
    'Data da Avaliação': 'Fecha de evaluación',
  },
  fr: {
    'A carregar...': 'Chargement...',
    'Inventário de IA': 'Inventaire IA',
    'sistemas de IA registados': 'systèmes IA enregistrés',
    'Exportar CSV': 'Exporter CSV',
    'Novo Caso': 'Nouveau cas',
    'Inaceitável': 'Inacceptable',
    'Alto Risco': 'Risque élevé',
    'Risco Limitado': 'Risque limité',
    'Risco Mínimo': 'Risque minimal',
    'Pesquisar por nome ou fornecedor...': 'Rechercher par nom ou fournisseur...',
    'Risco: Todos': 'Risque : Tous',
    'Dept: Todos': 'Service : Tous',
    'Status: Todos': 'Statut : Tous',
    'Em revisão': 'En révision',
    'Conforme': 'Conforme',
    'Não conforme': 'Non conforme',
    'Mitigado': 'Atténué',
    'Nenhum sistema corresponde aos filtros.': 'Aucun système ne correspond aux filtres.',
    'Nenhum sistema de IA registado.': 'Aucun système IA enregistré.',
    'Criar primeiro caso': 'Créer le premier cas',
    'Nome': 'Nom',
    'Risco': 'Risque',
    'Status': 'Statut',
    'Departamento': 'Service',
    'Avaliado em': 'Évalué le',
    'Fornecedor': 'Fournisseur',
    'Nível de Risco': 'Niveau de risque',
    'Data da Avaliação': 'Date d’évaluation',
  },
  it: {
    'A carregar...': 'Caricamento...',
    'Inventário de IA': 'Inventario IA',
    'sistemas de IA registados': 'sistemi IA registrati',
    'Exportar CSV': 'Esporta CSV',
    'Novo Caso': 'Nuovo caso',
    'Inaceitável': 'Inaccettabile',
    'Alto Risco': 'Alto rischio',
    'Risco Limitado': 'Rischio limitato',
    'Risco Mínimo': 'Rischio minimo',
    'Pesquisar por nome ou fornecedor...': 'Cerca per nome o fornitore...',
    'Risco: Todos': 'Rischio: Tutti',
    'Dept: Todos': 'Reparto: Tutti',
    'Status: Todos': 'Stato: Tutti',
    'Em revisão': 'In revisione',
    'Conforme': 'Conforme',
    'Não conforme': 'Non conforme',
    'Mitigado': 'Mitigato',
    'Nenhum sistema corresponde aos filtros.': 'Nessun sistema corrisponde ai filtri.',
    'Nenhum sistema de IA registado.': 'Nessun sistema IA registrato.',
    'Criar primeiro caso': 'Crea primo caso',
    'Nome': 'Nome',
    'Risco': 'Rischio',
    'Status': 'Stato',
    'Departamento': 'Reparto',
    'Avaliado em': 'Valutato il',
    'Fornecedor': 'Fornitore',
    'Nível de Risco': 'Livello di rischio',
    'Data da Avaliação': 'Data valutazione',
  },
  de: {
    'A carregar...': 'Wird geladen...',
    'Inventário de IA': 'KI-Inventar',
    'sistemas de IA registados': 'registrierte KI-Systeme',
    'Exportar CSV': 'CSV exportieren',
    'Novo Caso': 'Neuer Fall',
    'Inaceitável': 'Unzulässig',
    'Alto Risco': 'Hohes Risiko',
    'Risco Limitado': 'Begrenztes Risiko',
    'Risco Mínimo': 'Minimales Risiko',
    'Pesquisar por nome ou fornecedor...': 'Nach Name oder Anbieter suchen...',
    'Risco: Todos': 'Risiko: Alle',
    'Dept: Todos': 'Abteilung: Alle',
    'Status: Todos': 'Status: Alle',
    'Em revisão': 'In Prüfung',
    'Conforme': 'Konform',
    'Não conforme': 'Nicht konform',
    'Mitigado': 'Gemindert',
    'Nenhum sistema corresponde aos filtros.': 'Kein System entspricht den Filtern.',
    'Nenhum sistema de IA registado.': 'Kein KI-System registriert.',
    'Criar primeiro caso': 'Ersten Fall erstellen',
    'Nome': 'Name',
    'Risco': 'Risiko',
    'Status': 'Status',
    'Departamento': 'Abteilung',
    'Avaliado em': 'Bewertet am',
    'Fornecedor': 'Anbieter',
    'Nível de Risco': 'Risikostufe',
    'Data da Avaliação': 'Bewertungsdatum',
  },
};

const INVENTORY_COUNT_KEY = 'sistemas de IA registados';

const INVENTORY_COUNT_FORMS: Record<Locale, { singular: string; plural: string }> = {
  pt: { singular: 'sistema de IA registado', plural: 'sistemas de IA registados' },
  en: { singular: 'AI system registered', plural: 'AI systems registered' },
  es: { singular: 'sistema de IA registrado', plural: 'sistemas de IA registrados' },
  fr: { singular: 'système IA enregistré', plural: 'systèmes IA enregistrés' },
  it: { singular: 'sistema IA registrato', plural: 'sistemi IA registrati' },
  de: { singular: 'registriertes KI-System', plural: 'registrierte KI-Systeme' },
};

export function translateDashboardChildText(value: string, locale: Locale): string {
  const map = maps[locale] || maps.en;
  const normalized = value.trim();
  const exact = map[normalized];
  if (exact) return exact;

  const countMatch = normalized.match(new RegExp(`^(\\d+)\\s+${INVENTORY_COUNT_KEY}$`, 'u'));
  if (countMatch) {
    const count = Number(countMatch[1]);
    const form = count === 1 ? INVENTORY_COUNT_FORMS[locale].singular : INVENTORY_COUNT_FORMS[locale].plural;
    return `${countMatch[1]} ${form}`;
  }

  return normalized;
}

function replaceText(root: ParentNode, locale: Locale) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const value = node.nodeValue?.trim();
    if (value && translateDashboardChildText(value, locale) !== value) nodes.push(node);
  }
  for (const node of nodes) {
    const original = node.nodeValue || '';
    const trimmed = original.trim();
    node.nodeValue = original.replace(trimmed, translateDashboardChildText(trimmed, locale));
  }
}

function replaceAttributes(root: ParentNode, locale: Locale) {
  if (!(root instanceof Document || root instanceof Element)) return;
  const elements = root.querySelectorAll('[placeholder]');
  elements.forEach((el) => {
    const current = el.getAttribute('placeholder');
    if (!current) return;
    const translated = translateDashboardChildText(current, locale);
    if (translated !== current) el.setAttribute('placeholder', translated);
  });
}

export default function DashboardChildI18nRuntime() {
  const pathname = usePathname();
  const params = useParams();
  const locale = ((params.locale as Locale) || 'en') as Locale;

  useEffect(() => {
    if (!pathname.includes('/dashboard/')) return;
    if (locale === 'pt') return;

    const apply = () => {
      replaceText(document.body, locale);
      replaceAttributes(document.body, locale);
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder'] });
    return () => observer.disconnect();
  }, [locale, pathname]);

  return null;
}
