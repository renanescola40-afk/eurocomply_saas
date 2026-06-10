'use client';

import { FormEvent, useMemo, useState } from 'react';
import { AlertTriangle, Bot, BrainCircuit, CheckCircle2, Database, FileText, Plus, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AiSystemRecord } from '@/server/queries/ai-systems';
import type { AiActRiskLevel } from '@/server/ai-governance/classifier';
import { ReadinessCard } from './readiness-card';
import { RoleWizardCard } from './role-wizard-card';

type AiSystemsClientProps = {
  locale: string;
  initialSystems: AiSystemRecord[];
  organizationName?: string | null;
};

type FormState = {
  name: string;
  ownerTeam: string;
  vendorName: string;
  useCase: string;
  role: string;
  lifecycleStatus: string;
  riskDomain: string;
  usesPersonalData: boolean;
  interactsWithPeople: boolean;
  generatesContent: boolean;
  biometricIdentification: boolean;
  manipulativeOrExploitative: boolean;
};

const defaultForm: FormState = {
  name: '',
  ownerTeam: '',
  vendorName: '',
  useCase: '',
  role: 'deployer',
  lifecycleStatus: 'planned',
  riskDomain: 'general_productivity',
  usesPersonalData: false,
  interactsWithPeople: false,
  generatesContent: false,
  biometricIdentification: false,
  manipulativeOrExploitative: false,
};

const copy = {
  en: {
    badge: 'AI Governance',
    title: 'AI systems inventory',
    subtitle: 'Register AI tools, classify AI Act exposure and keep first obligations visible for audit readiness.',
    org: 'Organization',
    total: 'AI systems',
    high: 'High-risk review',
    transparency: 'Transparency',
    addTitle: 'Register AI system',
    addSubtitle: 'Start with the facts: purpose, role, domain, personal data and user interaction.',
    name: 'System name',
    ownerTeam: 'Owner team',
    vendorName: 'Vendor or model provider',
    useCase: 'Describe the use case',
    useCasePlaceholder: 'Example: summarises customer support tickets and suggests replies to agents.',
    role: 'Organization role',
    status: 'Lifecycle status',
    domain: 'Risk domain',
    checks: 'Assessment flags',
    personalData: 'Processes personal data',
    people: 'Interacts directly with people',
    content: 'Generates content or decisions',
    biometric: 'Biometric identification or categorisation',
    prohibited: 'Could manipulate, exploit vulnerability or enable prohibited use',
    submit: 'Classify and save',
    saving: 'Classifying...',
    empty: 'No AI systems registered yet. Add the first one to build your AI Act inventory.',
    obligations: 'Initial obligations',
    nextActions: 'Next actions',
    error: 'Could not create AI system.',
    migration: 'The AI governance table is not available yet. Apply the Supabase migration before saving systems.',
  },
  pt: {
    badge: 'Governação de IA',
    title: 'Inventário de sistemas de IA',
    subtitle: 'Registe ferramentas de IA, classifique exposição ao AI Act e mantenha obrigações iniciais visíveis para auditoria.',
    org: 'Organização',
    total: 'Sistemas de IA',
    high: 'Revisão alto risco',
    transparency: 'Transparência',
    addTitle: 'Registar sistema de IA',
    addSubtitle: 'Comece pelos factos: finalidade, papel, domínio, dados pessoais e interação com utilizadores.',
    name: 'Nome do sistema',
    ownerTeam: 'Equipa responsável',
    vendorName: 'Fornecedor ou provedor do modelo',
    useCase: 'Descreva o caso de uso',
    useCasePlaceholder: 'Exemplo: resume tickets de suporte e sugere respostas aos agentes.',
    role: 'Papel da organização',
    status: 'Estado do ciclo de vida',
    domain: 'Domínio de risco',
    checks: 'Sinais de avaliação',
    personalData: 'Trata dados pessoais',
    people: 'Interage diretamente com pessoas',
    content: 'Gera conteúdo ou decisões',
    biometric: 'Identificação ou categorização biométrica',
    prohibited: 'Pode manipular, explorar vulnerabilidade ou permitir uso proibido',
    submit: 'Classificar e guardar',
    saving: 'A classificar...',
    empty: 'Ainda não há sistemas de IA registados. Adicione o primeiro para construir o inventário AI Act.',
    obligations: 'Obrigações iniciais',
    nextActions: 'Próximas ações',
    error: 'Não foi possível criar o sistema de IA.',
    migration: 'A tabela de governação de IA ainda não está disponível. Aplique a migration Supabase antes de guardar sistemas.',
  },
  es: {
    badge: 'Gobierno de IA',
    title: 'Inventario de sistemas de IA',
    subtitle: 'Registra herramientas de IA, clasifica exposición al AI Act y conserva obligaciones iniciales para auditoría.',
    org: 'Organización',
    total: 'Sistemas de IA',
    high: 'Revisión alto riesgo',
    transparency: 'Transparencia',
    addTitle: 'Registrar sistema de IA',
    addSubtitle: 'Empieza por los hechos: finalidad, rol, dominio, datos personales e interacción con usuarios.',
    name: 'Nombre del sistema',
    ownerTeam: 'Equipo responsable',
    vendorName: 'Proveedor o modelo',
    useCase: 'Describe el caso de uso',
    useCasePlaceholder: 'Ejemplo: resume tickets de soporte y sugiere respuestas a agentes.',
    role: 'Rol de la organización',
    status: 'Estado del ciclo de vida',
    domain: 'Dominio de riesgo',
    checks: 'Señales de evaluación',
    personalData: 'Procesa datos personales',
    people: 'Interactúa directamente con personas',
    content: 'Genera contenido o decisiones',
    biometric: 'Identificación o categorización biométrica',
    prohibited: 'Podría manipular, explotar vulnerabilidad o permitir uso prohibido',
    submit: 'Clasificar y guardar',
    saving: 'Clasificando...',
    empty: 'Todavía no hay sistemas de IA registrados. Añade el primero para construir el inventario AI Act.',
    obligations: 'Obligaciones iniciales',
    nextActions: 'Próximas acciones',
    error: 'No se pudo crear el sistema de IA.',
    migration: 'La tabla de gobierno de IA aún no está disponible. Aplica la migración de Supabase antes de guardar sistemas.',
  },
  fr: {
    badge: 'Gouvernance IA',
    title: 'Inventaire des systèmes IA',
    subtitle: 'Recensez les outils IA, classez l’exposition AI Act et gardez les premières obligations prêtes pour l’audit.',
    org: 'Organisation', total: 'Systèmes IA', high: 'Revue haut risque', transparency: 'Transparence', addTitle: 'Enregistrer un système IA', addSubtitle: 'Commencez par les faits : finalité, rôle, domaine, données personnelles et interaction utilisateur.', name: 'Nom du système', ownerTeam: 'Équipe responsable', vendorName: 'Fournisseur ou modèle', useCase: 'Décrire le cas d’usage', useCasePlaceholder: 'Exemple : résume les tickets support et suggère des réponses.', role: 'Rôle de l’organisation', status: 'Statut du cycle de vie', domain: 'Domaine de risque', checks: 'Signaux d’évaluation', personalData: 'Traite des données personnelles', people: 'Interagit directement avec des personnes', content: 'Génère du contenu ou des décisions', biometric: 'Identification ou catégorisation biométrique', prohibited: 'Peut manipuler, exploiter une vulnérabilité ou permettre un usage interdit', submit: 'Classer et enregistrer', saving: 'Classification...', empty: 'Aucun système IA enregistré. Ajoutez le premier pour construire l’inventaire AI Act.', obligations: 'Obligations initiales', nextActions: 'Prochaines actions', error: 'Impossible de créer le système IA.', migration: 'La table de gouvernance IA n’est pas encore disponible. Appliquez la migration Supabase avant d’enregistrer.',
  },
  it: {
    badge: 'Governance IA',
    title: 'Inventario dei sistemi IA',
    subtitle: 'Registra strumenti IA, classifica l’esposizione all’AI Act e mantieni visibili gli obblighi iniziali.',
    org: 'Organizzazione', total: 'Sistemi IA', high: 'Revisione alto rischio', transparency: 'Trasparenza', addTitle: 'Registra sistema IA', addSubtitle: 'Parti dai fatti: finalità, ruolo, dominio, dati personali e interazione con utenti.', name: 'Nome del sistema', ownerTeam: 'Team responsabile', vendorName: 'Fornitore o modello', useCase: 'Descrivi il caso d’uso', useCasePlaceholder: 'Esempio: riassume ticket di supporto e suggerisce risposte.', role: 'Ruolo dell’organizzazione', status: 'Stato ciclo di vita', domain: 'Dominio di rischio', checks: 'Segnali di valutazione', personalData: 'Tratta dati personali', people: 'Interagisce direttamente con persone', content: 'Genera contenuto o decisioni', biometric: 'Identificazione o categorizzazione biometrica', prohibited: 'Potrebbe manipolare, sfruttare vulnerabilità o abilitare uso vietato', submit: 'Classifica e salva', saving: 'Classificazione...', empty: 'Nessun sistema IA registrato. Aggiungi il primo per costruire l’inventario AI Act.', obligations: 'Obblighi iniziali', nextActions: 'Prossime azioni', error: 'Impossibile creare il sistema IA.', migration: 'La tabella di governance IA non è ancora disponibile. Applica la migration Supabase prima di salvare.',
  },
  de: {
    badge: 'KI-Governance',
    title: 'Inventar der KI-Systeme',
    subtitle: 'Erfassen Sie KI-Tools, klassifizieren Sie AI-Act-Exposition und halten Sie erste Pflichten auditbereit.',
    org: 'Organisation', total: 'KI-Systeme', high: 'High-Risk-Prüfung', transparency: 'Transparenz', addTitle: 'KI-System erfassen', addSubtitle: 'Beginnen Sie mit Fakten: Zweck, Rolle, Bereich, personenbezogene Daten und Nutzerinteraktion.', name: 'Systemname', ownerTeam: 'Verantwortliches Team', vendorName: 'Anbieter oder Modell', useCase: 'Anwendungsfall beschreiben', useCasePlaceholder: 'Beispiel: fasst Support-Tickets zusammen und schlägt Antworten vor.', role: 'Rolle der Organisation', status: 'Lebenszyklusstatus', domain: 'Risikobereich', checks: 'Bewertungssignale', personalData: 'Verarbeitet personenbezogene Daten', people: 'Interagiert direkt mit Personen', content: 'Erzeugt Inhalte oder Entscheidungen', biometric: 'Biometrische Identifikation oder Kategorisierung', prohibited: 'Könnte manipulieren, Schwachstellen ausnutzen oder verbotene Nutzung ermöglichen', submit: 'Klassifizieren und speichern', saving: 'Klassifizierung...', empty: 'Noch keine KI-Systeme erfasst. Fügen Sie das erste hinzu, um das AI-Act-Inventar aufzubauen.', obligations: 'Erste Pflichten', nextActions: 'Nächste Schritte', error: 'KI-System konnte nicht erstellt werden.', migration: 'Die KI-Governance-Tabelle ist noch nicht verfügbar. Wenden Sie die Supabase-Migration vor dem Speichern an.',
  },
} as const;

const roleOptions = [
  ['provider', 'Provider'],
  ['deployer', 'Deployer'],
  ['importer', 'Importer'],
  ['distributor', 'Distributor'],
  ['other', 'Other'],
] as const;

const statusOptions = [
  ['planned', 'Planned'],
  ['pilot', 'Pilot'],
  ['production', 'Production'],
  ['retired', 'Retired'],
] as const;

const domainOptions = [
  ['general_productivity', 'General productivity'],
  ['customer_support', 'Customer support'],
  ['content_generation', 'Content generation'],
  ['biometrics', 'Biometrics'],
  ['employment', 'Employment / workers'],
  ['education', 'Education'],
  ['credit_finance', 'Credit / finance'],
  ['essential_services', 'Essential services'],
  ['law_enforcement', 'Law enforcement'],
  ['migration_border', 'Migration / border'],
  ['justice_democratic_processes', 'Justice / democratic processes'],
  ['safety_component', 'Safety component'],
  ['critical_infrastructure', 'Critical infrastructure'],
] as const;

function getCopy(locale: string) {
  return copy[locale as keyof typeof copy] ?? copy.en;
}

function getRiskLabel(level: AiActRiskLevel) {
  if (level === 'prohibited_review') return 'Prohibited review';
  if (level === 'high_risk_review') return 'High-risk review';
  if (level === 'limited_transparency') return 'Limited transparency';
  return 'Minimal / low';
}

function getRiskTone(level: AiActRiskLevel) {
  if (level === 'prohibited_review') return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200';
  if (level === 'high_risk_review') return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200';
  if (level === 'limited_transparency') return 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-200';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200';
}

export function AiSystemsClient({ locale, initialSystems, organizationName }: AiSystemsClientProps) {
  const t = getCopy(locale);
  const [systems, setSystems] = useState(initialSystems);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  const stats = useMemo(() => {
    const highRisk = systems.filter((system) => system.risk_level === 'high_risk_review' || system.risk_level === 'prohibited_review').length;
    const transparency = systems.filter((system) => system.risk_level === 'limited_transparency').length;
    return { highRisk, transparency };
  }, [systems]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setNotice('');

    const response = await fetch('/api/ai-systems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setNotice(payload?.error === 'ai_systems_table_missing' ? t.migration : payload?.message ?? t.error);
      setIsSubmitting(false);
      return;
    }

    setSystems((current) => [payload.system as AiSystemRecord, ...current]);
    setForm(defaultForm);
    setIsSubmitting(false);
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-8">
      <div className="rounded-[2rem] border bg-background/88 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Badge variant="outline" className="rounded-full"><BrainCircuit className="mr-1 h-3.5 w-3.5" />{t.badge}</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{t.title}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{t.subtitle}</p>
            {organizationName ? <p className="mt-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">{t.org}: {organizationName}</p> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <div className="rounded-2xl border bg-muted/20 p-4"><Database className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-bold">{systems.length}</p><p className="text-xs text-muted-foreground">{t.total}</p></div>
            <div className="rounded-2xl border bg-muted/20 p-4"><ShieldAlert className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-bold">{stats.highRisk}</p><p className="text-xs text-muted-foreground">{t.high}</p></div>
            <div className="rounded-2xl border bg-muted/20 p-4"><FileText className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-bold">{stats.transparency}</p><p className="text-xs text-muted-foreground">{t.transparency}</p></div>
          </div>
        </div>

        <ReadinessCard locale={locale} systems={systems} />

        <form onSubmit={submit} className="mt-8 rounded-3xl border bg-muted/20 p-5">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">{t.addTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.addSubtitle}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input required value={form.name} onChange={(event) => update('name', event.target.value)} placeholder={t.name} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            <input value={form.ownerTeam} onChange={(event) => update('ownerTeam', event.target.value)} placeholder={t.ownerTeam} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            <input value={form.vendorName} onChange={(event) => update('vendorName', event.target.value)} placeholder={t.vendorName} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            <select value={form.role} onChange={(event) => update('role', event.target.value)} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" aria-label={t.role}>
              {roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={form.lifecycleStatus} onChange={(event) => update('lifecycleStatus', event.target.value)} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" aria-label={t.status}>
              {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={form.riskDomain} onChange={(event) => update('riskDomain', event.target.value)} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" aria-label={t.domain}>
              {domainOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <textarea required minLength={8} value={form.useCase} onChange={(event) => update('useCase', event.target.value)} placeholder={t.useCasePlaceholder} className="min-h-28 rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary md:col-span-2" />
          </div>
          <fieldset className="mt-5 grid gap-3 rounded-2xl border bg-background p-4 md:grid-cols-2">
            <legend className="px-2 text-sm font-medium">{t.checks}</legend>
            {[
              ['usesPersonalData', t.personalData],
              ['interactsWithPeople', t.people],
              ['generatesContent', t.content],
              ['biometricIdentification', t.biometric],
              ['manipulativeOrExploitative', t.prohibited],
            ].map(([key, label]) => (
              <label key={key} className="flex items-start gap-3 rounded-xl border bg-muted/20 p-3 text-sm">
                <input type="checkbox" checked={Boolean(form[key as keyof FormState])} onChange={(event) => update(key as keyof FormState, event.target.checked as never)} className="mt-1" />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <RoleWizardCard locale={locale} input={form} />
          {notice ? <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-100"><AlertTriangle className="mr-2 inline h-4 w-4" />{notice}</div> : null}
          <Button type="submit" disabled={isSubmitting} className="mt-5 rounded-full">
            <Plus className="h-4 w-4" />{isSubmitting ? t.saving : t.submit}
          </Button>
        </form>

        <div className="mt-8 grid gap-4">
          {systems.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground"><Bot className="mx-auto mb-3 h-8 w-8" />{t.empty}</div>
          ) : systems.map((system) => (
            <article key={system.id} className="rounded-3xl border bg-background p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold">{system.name}</h2>
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getRiskTone(system.risk_level)}`}>{getRiskLabel(system.risk_level)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{system.use_case}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline">{system.role}</Badge>
                    <Badge variant="outline">{system.lifecycle_status}</Badge>
                    <Badge variant="outline">{system.risk_domain}</Badge>
                    {system.vendor_name ? <Badge variant="outline">{system.vendor_name}</Badge> : null}
                  </div>
                </div>
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="font-medium">{system.classification_summary}</p>
                  <h3 className="mt-4 text-sm font-semibold">{t.obligations}</h3>
                  <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                    {system.obligations.map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <h3 className="text-sm font-semibold">{t.nextActions}</h3>
                  <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                    {system.next_actions.map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
