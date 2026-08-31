'use client';

import { AlertTriangle, BadgeCheck, GitBranch, Scale, ShieldQuestion } from 'lucide-react';
import { evaluateAiGovernanceRole, type AiGovernanceRole, type RoleConfidence, type RoleNextStep, type RoleSignal, type RoleWizardInput } from '@/lib/ai-governance/role-wizard';

type RoleWizardCardProps = {
  locale: string;
  input: RoleWizardInput;
};

const copy = {
  en: {
    title: 'Provider vs Deployer Wizard',
    subtitle: 'Live role check based on the facts entered above. Use it to avoid treating a provider obligation as a simple internal-use case.',
    recommended: 'Recommended role',
    confidence: 'Confidence',
    signals: 'Detected signals',
    nextSteps: 'Next steps',
    review: 'Legal/compliance review recommended',
    role: { provider: 'Provider', deployer: 'Deployer', importer: 'Importer', distributor: 'Distributor', other: 'Needs review' },
    confidenceLabel: { low: 'Low', medium: 'Medium', high: 'High' },
  },
  pt: {
    title: 'Wizard Provedor vs Deployer',
    subtitle: 'Verificação em tempo real com base nos factos acima. Ajuda a evitar tratar uma obrigação de provedor como simples uso interno.',
    recommended: 'Papel recomendado',
    confidence: 'Confiança',
    signals: 'Sinais detetados',
    nextSteps: 'Próximos passos',
    review: 'Revisão legal/compliance recomendada',
    role: { provider: 'Provedor', deployer: 'Deployer', importer: 'Importador', distributor: 'Distribuidor', other: 'Requer revisão' },
    confidenceLabel: { low: 'Baixa', medium: 'Média', high: 'Alta' },
  },
  es: {
    title: 'Wizard Proveedor vs Deployer',
    subtitle: 'Verificación en tiempo real basada en los datos anteriores. Evita tratar una obligación de proveedor como simple uso interno.',
    recommended: 'Rol recomendado',
    confidence: 'Confianza',
    signals: 'Señales detectadas',
    nextSteps: 'Próximos pasos',
    review: 'Revisión legal/compliance recomendada',
    role: { provider: 'Proveedor', deployer: 'Deployer', importer: 'Importador', distributor: 'Distribuidor', other: 'Requiere revisión' },
    confidenceLabel: { low: 'Baja', medium: 'Media', high: 'Alta' },
  },
  fr: {
    title: 'Assistant Fournisseur vs Déployeur', subtitle: 'Vérification en temps réel selon les faits saisis. Évite de confondre obligations fournisseur et usage interne.', recommended: 'Rôle recommandé', confidence: 'Confiance', signals: 'Signaux détectés', nextSteps: 'Prochaines étapes', review: 'Revue juridique/conformité recommandée', role: { provider: 'Fournisseur', deployer: 'Déployeur', importer: 'Importateur', distributor: 'Distributeur', other: 'À revoir' }, confidenceLabel: { low: 'Faible', medium: 'Moyenne', high: 'Élevée' },
  },
  it: {
    title: 'Wizard Provider vs Deployer', subtitle: 'Verifica in tempo reale basata sui dati inseriti. Evita di trattare obblighi da provider come semplice uso interno.', recommended: 'Ruolo consigliato', confidence: 'Confidenza', signals: 'Segnali rilevati', nextSteps: 'Prossimi passi', review: 'Revisione legale/compliance consigliata', role: { provider: 'Provider', deployer: 'Deployer', importer: 'Importatore', distributor: 'Distributore', other: 'Da rivedere' }, confidenceLabel: { low: 'Bassa', medium: 'Media', high: 'Alta' },
  },
  de: {
    title: 'Wizard Anbieter vs Deployer', subtitle: 'Live-Prüfung anhand der eingegebenen Fakten. Verhindert, dass Anbieterpflichten als bloße interne Nutzung behandelt werden.', recommended: 'Empfohlene Rolle', confidence: 'Vertrauen', signals: 'Erkannte Signale', nextSteps: 'Nächste Schritte', review: 'Rechtliche/Compliance-Prüfung empfohlen', role: { provider: 'Anbieter', deployer: 'Deployer', importer: 'Importeur', distributor: 'Distributor', other: 'Prüfen' }, confidenceLabel: { low: 'Niedrig', medium: 'Mittel', high: 'Hoch' },
  },
} as const;

const signalCopy: Record<RoleSignal, Record<keyof typeof copy, string>> = {
  selected_provider: { en: 'You selected provider role.', pt: 'Selecionou papel de provedor.', es: 'Seleccionaste rol de proveedor.', fr: 'Rôle fournisseur sélectionné.', it: 'Ruolo provider selezionato.', de: 'Anbieterrolle ausgewählt.' },
  selected_deployer: { en: 'You selected deployer role.', pt: 'Selecionou papel de deployer.', es: 'Seleccionaste rol de deployer.', fr: 'Rôle déployeur sélectionné.', it: 'Ruolo deployer selezionato.', de: 'Deployer-Rolle ausgewählt.' },
  selected_importer: { en: 'Importer role selected.', pt: 'Papel de importador selecionado.', es: 'Rol de importador seleccionado.', fr: 'Rôle importateur sélectionné.', it: 'Ruolo importatore selezionato.', de: 'Importeurrolle ausgewählt.' },
  selected_distributor: { en: 'Distributor role selected.', pt: 'Papel de distribuidor selecionado.', es: 'Rol de distribuidor seleccionado.', fr: 'Rôle distributeur sélectionné.', it: 'Ruolo distributore selezionato.', de: 'Distributorrolle ausgewählt.' },
  third_party_vendor: { en: 'A third-party vendor/model provider is involved.', pt: 'Existe fornecedor ou provedor de modelo externo.', es: 'Hay proveedor o modelo externo.', fr: 'Un fournisseur/modèle tiers est impliqué.', it: 'È coinvolto un provider/modello terzo.', de: 'Ein Drittanbieter/Modellanbieter ist beteiligt.' },
  customer_facing_use: { en: 'Use case appears customer-facing or externally exposed.', pt: 'O caso de uso parece exposto a clientes ou externo.', es: 'El caso de uso parece expuesto a clientes o externo.', fr: 'Le cas d’usage semble exposé aux clients ou externe.', it: 'Il caso d’uso sembra esposto a clienti o esterno.', de: 'Der Anwendungsfall scheint kunden-/extern ausgerichtet.' },
  internal_use: { en: 'Signals point to internal operational use.', pt: 'Os sinais apontam para uso operacional interno.', es: 'Las señales apuntan a uso operativo interno.', fr: 'Les signaux indiquent un usage opérationnel interne.', it: 'I segnali indicano uso operativo interno.', de: 'Signale deuten auf interne operative Nutzung hin.' },
  substantial_modification_review: { en: 'Potential provider/substantial modification review.', pt: 'Possível revisão de provedor ou modificação substancial.', es: 'Posible revisión de proveedor o modificación sustancial.', fr: 'Revue fournisseur/modification substantielle possible.', it: 'Possibile revisione provider/modifica sostanziale.', de: 'Mögliche Anbieter-/wesentliche Änderungsprüfung.' },
  high_risk_domain: { en: 'Domain may trigger high-risk review.', pt: 'O domínio pode exigir revisão de alto risco.', es: 'El dominio puede exigir revisión de alto riesgo.', fr: 'Le domaine peut déclencher une revue haut risque.', it: 'Il dominio può richiedere revisione alto rischio.', de: 'Der Bereich kann High-Risk-Prüfung auslösen.' },
  transparency_surface: { en: 'Transparency obligations may apply.', pt: 'Podem aplicar-se obrigações de transparência.', es: 'Pueden aplicar obligaciones de transparencia.', fr: 'Des obligations de transparence peuvent s’appliquer.', it: 'Potrebbero applicarsi obblighi di trasparenza.', de: 'Transparenzpflichten können gelten.' },
  biometric_or_prohibited_review: { en: 'Biometric/prohibited-practice review needed.', pt: 'Revisão biométrica/prática proibida necessária.', es: 'Revisión biométrica/práctica prohibida necesaria.', fr: 'Revue biométrique/pratique interdite nécessaire.', it: 'Revisione biometrica/pratica vietata necessaria.', de: 'Biometrie-/Verbotsprüfung erforderlich.' },
};

const stepCopy: Record<RoleNextStep, Record<keyof typeof copy, string>> = {
  confirm_contractual_role: { en: 'Confirm contractual role in vendor/customer agreements.', pt: 'Confirmar papel contratual em acordos com fornecedor/cliente.', es: 'Confirmar rol contractual en acuerdos con proveedor/cliente.', fr: 'Confirmer le rôle contractuel dans les accords.', it: 'Confermare il ruolo contrattuale negli accordi.', de: 'Vertragliche Rolle in Vereinbarungen bestätigen.' },
  document_intended_purpose: { en: 'Document intended purpose and foreseeable misuse.', pt: 'Documentar finalidade prevista e uso indevido previsível.', es: 'Documentar finalidad prevista y mal uso previsible.', fr: 'Documenter finalité prévue et mauvaise utilisation prévisible.', it: 'Documentare finalità prevista e uso improprio prevedibile.', de: 'Vorgesehenen Zweck und vorhersehbaren Missbrauch dokumentieren.' },
  collect_vendor_evidence: { en: 'Collect vendor evidence and technical documentation.', pt: 'Recolher evidências do fornecedor e documentação técnica.', es: 'Recopilar evidencias del proveedor y documentación técnica.', fr: 'Collecter preuves fournisseur et documentation technique.', it: 'Raccogliere evidenze fornitore e documentazione tecnica.', de: 'Anbieternachweise und technische Dokumentation sammeln.' },
  run_high_risk_assessment: { en: 'Run high-risk assessment before production.', pt: 'Executar avaliação de alto risco antes de produção.', es: 'Ejecutar evaluación de alto riesgo antes de producción.', fr: 'Réaliser une évaluation haut risque avant production.', it: 'Eseguire valutazione alto rischio prima della produzione.', de: 'High-Risk-Bewertung vor Produktion durchführen.' },
  prepare_transparency_notice: { en: 'Prepare transparency notice or AI interaction disclosure.', pt: 'Preparar aviso de transparência ou disclosure de interação com IA.', es: 'Preparar aviso de transparencia o disclosure de interacción con IA.', fr: 'Préparer notice de transparence ou disclosure IA.', it: 'Preparare avviso di trasparenza o disclosure IA.', de: 'Transparenzhinweis oder KI-Interaktionshinweis vorbereiten.' },
  assign_accountable_owner: { en: 'Assign accountable business and compliance owners.', pt: 'Atribuir responsáveis de negócio e compliance.', es: 'Asignar responsables de negocio y compliance.', fr: 'Attribuer responsables métier et conformité.', it: 'Assegnare responsabili business e compliance.', de: 'Business- und Compliance-Verantwortliche zuweisen.' },
  escalate_legal_review: { en: 'Escalate for legal/compliance review.', pt: 'Escalar para revisão legal/compliance.', es: 'Escalar a revisión legal/compliance.', fr: 'Escalader en revue juridique/conformité.', it: 'Escalare a revisione legale/compliance.', de: 'Zur rechtlichen/Compliance-Prüfung eskalieren.' },
  check_import_distribution_chain: { en: 'Check importer/distributor chain and CE/evidence duties.', pt: 'Verificar cadeia importador/distribuidor e deveres de evidência/CE.', es: 'Verificar cadena importador/distribuidor y deberes CE/evidencia.', fr: 'Vérifier chaîne importateur/distributeur et obligations CE/preuves.', it: 'Verificare catena importatore/distributore e doveri CE/evidenza.', de: 'Import-/Distributionskette und CE/Nachweispflichten prüfen.' },
};

function getCopy(locale: string) {
  return copy[locale as keyof typeof copy] ?? copy.en;
}

function roleTone(role: AiGovernanceRole) {
  if (role === 'provider') return 'border-violet-300/20 bg-violet-300/[0.07] text-violet-100/85';
  if (role === 'deployer') return 'border-blue-300/20 bg-blue-300/[0.07] text-blue-100/85';
  if (role === 'importer') return 'border-sky-300/20 bg-sky-300/[0.07] text-sky-100/85';
  if (role === 'distributor') return 'border-indigo-300/20 bg-indigo-300/[0.07] text-indigo-100/85';
  return 'border-amber-300/20 bg-amber-300/[0.07] text-amber-100/85';
}

function confidenceTone(confidence: RoleConfidence) {
  if (confidence === 'high') return 'border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-100/85';
  if (confidence === 'medium') return 'border-blue-300/20 bg-blue-300/[0.07] text-blue-100/85';
  return 'border-amber-300/20 bg-amber-300/[0.07] text-amber-100/85';
}

export function RoleWizardCard({ locale, input }: RoleWizardCardProps) {
  const t = getCopy(locale);
  const language = (locale in copy ? locale : 'en') as keyof typeof copy;
  const assessment = evaluateAiGovernanceRole(input);

  return (
    <aside className="mt-5 overflow-hidden rounded-xl border border-white/[0.075] bg-[#0d1522] text-white">
      <div className="flex flex-col gap-4 border-b border-white/[0.055] px-5 py-5 lg:flex-row lg:items-start lg:justify-between md:px-6">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-md border border-violet-300/15 bg-violet-300/[0.055] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-100/75">
            <GitBranch className="h-3.5 w-3.5" />
            {t.title}
          </div>
          <p className="mt-3 text-sm leading-6 text-white/42">{t.subtitle}</p>
        </div>
        {assessment.needsLegalReview ? (
          <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.07] px-3 py-2.5 text-sm text-amber-100/80">
            <AlertTriangle className="mr-2 inline h-4 w-4" />{t.review}
          </div>
        ) : null}
      </div>

      <div className="grid lg:grid-cols-3">
        <div className="px-5 py-4 md:px-6">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">
            <Scale className="h-4 w-4 text-violet-200/70" />{t.recommended}
          </div>
          <span className={`mt-3 inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${roleTone(assessment.recommendedRole)}`}>
            {t.role[assessment.recommendedRole]}
          </span>
        </div>
        <div className="border-t border-white/[0.055] px-5 py-4 lg:border-l lg:border-t-0 md:px-6">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">
            <BadgeCheck className="h-4 w-4 text-blue-200/70" />{t.confidence}
          </div>
          <span className={`mt-3 inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${confidenceTone(assessment.confidence)}`}>
            {t.confidenceLabel[assessment.confidence]}
          </span>
        </div>
        <div className="border-t border-white/[0.055] px-5 py-4 lg:border-l lg:border-t-0 md:px-6">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">
            <ShieldQuestion className="h-4 w-4 text-blue-200/70" />{t.signals}
          </div>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-white/42">
            {assessment.signals.slice(0, 4).map((signal) => <li key={signal}>• {signalCopy[signal][language]}</li>)}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/[0.055] px-5 py-4 md:px-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">{t.nextSteps}</p>
        <ul className="mt-3 grid gap-x-8 gap-y-2 text-sm leading-6 text-white/46 md:grid-cols-2">
          {assessment.nextSteps.slice(0, 6).map((step) => <li key={step}>• {stepCopy[step][language]}</li>)}
        </ul>
      </div>
    </aside>
  );
}
