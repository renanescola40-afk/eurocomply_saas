'use client';

import { useEffect } from 'react';
import { usePathname, useParams } from 'next/navigation';

type Locale = 'en' | 'pt' | 'es' | 'fr' | 'it' | 'de';

type ReplacementMap = Record<string, string>;

const replacements: Record<Locale, ReplacementMap> = {
  en: {
    'Inventário de IA': 'AI Inventory',
    'Transparência': 'Transparency',
    'Monitoramento': 'Monitoring',
    'Faturamento': 'Billing',
    'Sair': 'Log out',
    'Enterprise console': 'Enterprise console',
    'Site': 'Site',
    'Inicializando console enterprise...': 'Initializing enterprise console...',
    'Compliance readiness em tempo real.': 'Real-time compliance readiness.',
    'Inventário, avaliações, documentação e monitoramento contínuo em uma interface construída para decisões executivas.': 'Inventory, assessments, documentation and continuous monitoring in an interface built for executive decisions.',
    'Live console': 'Live console',
    'Compliance Score': 'Compliance Score',
    '+5% este mês': '+5% this month',
    'AI Risk Score': 'AI Risk Score',
    'Medium': 'Medium',
    'Low': 'Low',
    'High': 'High',
    'AI Systems': 'AI Systems',
    'Sistemas registrados': 'Registered systems',
    'Documentos': 'Documents',
    'rascunhos': 'drafts',
    'Adicionar Sistema AI': 'Add AI System',
    'Novo Assessment': 'New Assessment',
    'Gerar Política': 'Generate Policy',
    'Verificar Plano': 'Check Plan',
    'Atividade Recente': 'Recent activity',
    'Plano Profissional ou superior necessário': 'Professional plan or higher required',
    'Sem permissão para alterar este workspace': 'You do not have permission to change this workspace',
    'Sistema de IA adicionado com sucesso': 'AI system added successfully',
    'Erro ao criar sistema de IA': 'Error creating AI system',
    'Assessment criado com sucesso': 'Assessment created successfully',
    'Erro ao criar assessment': 'Error creating assessment',
    'Documento criado com sucesso': 'Document created successfully',
    'Erro ao criar documento': 'Error creating document',
    'Monitoramento disponível apenas no plano Growth ou Enterprise': 'Monitoring is available only on Growth or Enterprise plans',
    'Preferências de monitoramento salvas': 'Monitoring preferences saved',
    'Erro ao salvar preferências': 'Error saving preferences',
    'Sessão inválida para iniciar checkout': 'Invalid session to start checkout',
    'Não foi possível iniciar o checkout': 'Could not start checkout',
  },
  pt: {},
  es: {
    'Overview': 'Resumen',
    'Inventário de IA': 'Inventario de IA',
    'Transparência': 'Transparencia',
    'Assessments': 'Evaluaciones',
    'Documents': 'Documentos',
    'Procurement': 'Compras',
    'Monitoramento': 'Monitorización',
    'Billing': 'Facturación',
    'Menu': 'Menú',
    'Sair': 'Salir',
    'Enterprise console': 'Consola enterprise',
    'Site': 'Sitio',
    'Inicializando console enterprise...': 'Inicializando consola enterprise...',
    'AI governance operating layer': 'Capa operativa de gobernanza de IA',
    'Compliance readiness em tempo real.': 'Preparación de cumplimiento en tiempo real.',
    'Inventário, avaliações, documentação e monitoramento contínuo em uma interface construída para decisões executivas.': 'Inventario, evaluaciones, documentación y monitorización continua en una interfaz para decisiones ejecutivas.',
    'Live console': 'Consola en vivo',
    'Compliance Score': 'Puntuación de cumplimiento',
    '+5% este mês': '+5% este mes',
    'AI Risk Score': 'Puntuación de riesgo de IA',
    'Medium': 'Medio',
    'Low': 'Bajo',
    'High': 'Alto',
    'AI Systems': 'Sistemas de IA',
    'Sistemas registrados': 'Sistemas registrados',
    'Documentos': 'Documentos',
    'rascunhos': 'borradores',
    'Adicionar Sistema AI': 'Añadir sistema de IA',
    'Novo Assessment': 'Nueva evaluación',
    'Gerar Política': 'Generar política',
    'Verificar Plano': 'Verificar plan',
    'Atividade Recente': 'Actividad reciente',
    'Plano Profissional ou superior necessário': 'Se requiere plan Profesional o superior',
  },
  fr: {
    'Overview': 'Vue d’ensemble',
    'Inventário de IA': 'Inventaire IA',
    'Transparência': 'Transparence',
    'Assessments': 'Évaluations',
    'Documents': 'Documents',
    'Procurement': 'Achats',
    'Monitoramento': 'Surveillance',
    'Billing': 'Facturation',
    'Menu': 'Menu',
    'Sair': 'Déconnexion',
    'Enterprise console': 'Console enterprise',
    'Site': 'Site',
    'Inicializando console enterprise...': 'Initialisation de la console enterprise...',
    'AI governance operating layer': 'Couche opérationnelle de gouvernance IA',
    'Compliance readiness em tempo real.': 'Préparation conformité en temps réel.',
    'Inventário, avaliações, documentação e monitoramento contínuo em uma interface construída para decisões executivas.': 'Inventaire, évaluations, documentation et surveillance continue dans une interface pensée pour les décisions exécutives.',
    'Live console': 'Console en direct',
    'Compliance Score': 'Score de conformité',
    '+5% este mês': '+5% ce mois-ci',
    'AI Risk Score': 'Score de risque IA',
    'Medium': 'Moyen',
    'Low': 'Faible',
    'High': 'Élevé',
    'AI Systems': 'Systèmes IA',
    'Sistemas registrados': 'Systèmes enregistrés',
    'Documentos': 'Documents',
    'rascunhos': 'brouillons',
    'Adicionar Sistema AI': 'Ajouter un système IA',
    'Novo Assessment': 'Nouvelle évaluation',
    'Gerar Política': 'Générer une politique',
    'Verificar Plano': 'Vérifier le plan',
    'Atividade Recente': 'Activité récente',
    'Plano Profissional ou superior necessário': 'Plan Professionnel ou supérieur requis',
  },
  it: {
    'Overview': 'Panoramica',
    'Inventário de IA': 'Inventario IA',
    'Transparência': 'Trasparenza',
    'Assessments': 'Valutazioni',
    'Documents': 'Documenti',
    'Procurement': 'Acquisti',
    'Monitoramento': 'Monitoraggio',
    'Billing': 'Fatturazione',
    'Menu': 'Menu',
    'Sair': 'Esci',
    'Enterprise console': 'Console enterprise',
    'Site': 'Sito',
    'Inicializando console enterprise...': 'Inizializzazione console enterprise...',
    'AI governance operating layer': 'Livello operativo di governance IA',
    'Compliance readiness em tempo real.': 'Prontezza compliance in tempo reale.',
    'Inventário, avaliações, documentação e monitoramento contínuo em uma interface construída para decisões executivas.': 'Inventario, valutazioni, documentazione e monitoraggio continuo in un’interfaccia per decisioni executive.',
    'Live console': 'Console live',
    'Compliance Score': 'Punteggio compliance',
    '+5% este mês': '+5% questo mese',
    'AI Risk Score': 'Punteggio rischio IA',
    'Medium': 'Medio',
    'Low': 'Basso',
    'High': 'Alto',
    'AI Systems': 'Sistemi IA',
    'Sistemas registrados': 'Sistemi registrati',
    'Documentos': 'Documenti',
    'rascunhos': 'bozze',
    'Adicionar Sistema AI': 'Aggiungi sistema IA',
    'Novo Assessment': 'Nuova valutazione',
    'Gerar Política': 'Genera policy',
    'Verificar Plano': 'Verifica piano',
    'Atividade Recente': 'Attività recente',
    'Plano Profissional ou superior necessário': 'Richiesto piano Professionale o superiore',
  },
  de: {
    'Overview': 'Übersicht',
    'Inventário de IA': 'KI-Inventar',
    'Transparência': 'Transparenz',
    'Assessments': 'Bewertungen',
    'Documents': 'Dokumente',
    'Procurement': 'Beschaffung',
    'Monitoramento': 'Monitoring',
    'Billing': 'Abrechnung',
    'Menu': 'Menü',
    'Sair': 'Abmelden',
    'Enterprise console': 'Enterprise-Konsole',
    'Site': 'Website',
    'Inicializando console enterprise...': 'Enterprise-Konsole wird initialisiert...',
    'AI governance operating layer': 'Operative KI-Governance-Ebene',
    'Compliance readiness em tempo real.': 'Compliance-Bereitschaft in Echtzeit.',
    'Inventário, avaliações, documentação e monitoramento contínuo em uma interface construída para decisões executivas.': 'Inventar, Bewertungen, Dokumentation und kontinuierliches Monitoring in einer Oberfläche für Management-Entscheidungen.',
    'Live console': 'Live-Konsole',
    'Compliance Score': 'Compliance-Score',
    '+5% este mês': '+5% diesen Monat',
    'AI Risk Score': 'KI-Risiko-Score',
    'Medium': 'Mittel',
    'Low': 'Niedrig',
    'High': 'Hoch',
    'AI Systems': 'KI-Systeme',
    'Sistemas registrados': 'Registrierte Systeme',
    'Documentos': 'Dokumente',
    'rascunhos': 'Entwürfe',
    'Adicionar Sistema AI': 'KI-System hinzufügen',
    'Novo Assessment': 'Neue Bewertung',
    'Gerar Política': 'Richtlinie erstellen',
    'Verificar Plano': 'Plan prüfen',
    'Atividade Recente': 'Aktuelle Aktivität',
    'Plano Profissional ou superior necessário': 'Professional-Plan oder höher erforderlich',
  },
};

function replaceTextNodes(root: ParentNode, map: ReplacementMap) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const value = node.nodeValue?.trim();
    if (value && map[value]) nodes.push(node);
  }

  for (const node of nodes) {
    const original = node.nodeValue || '';
    const trimmed = original.trim();
    node.nodeValue = original.replace(trimmed, map[trimmed]);
  }
}

export default function DashboardI18nRuntime() {
  const pathname = usePathname();
  const params = useParams();
  const locale = ((params.locale as Locale) || 'en') as Locale;

  useEffect(() => {
    if (!pathname.includes('/dashboard')) return;

    const map = replacements[locale] || replacements.en;
    if (!map || Object.keys(map).length === 0) return;

    const apply = () => replaceTextNodes(document.body, map);
    apply();

    const observer = new MutationObserver(() => apply());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, [locale, pathname]);

  return null;
}
