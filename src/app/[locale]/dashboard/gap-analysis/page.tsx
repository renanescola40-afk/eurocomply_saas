'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, FileText, ShieldCheck, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import GapActionCenter from '@/components/GapActionCenter';
import { useAuth } from '@/hooks/useAuth';
import { trySaveGapAssessment } from '@/lib/gap-analysis/storage';
import { tryCreateFindingsAndTasks } from '@/lib/compliance/remediation';

type Locale = 'en' | 'pt' | 'es' | 'fr' | 'it' | 'de';
type Answer = 'yes' | 'partial' | 'no' | '';

type Question = {
  id: string;
  article: string;
  category: Record<Locale, string>;
  text: Record<Locale, string>;
  recommendation: Record<Locale, string>;
};

const locales: Locale[] = ['en', 'pt', 'es', 'fr', 'it', 'de'];

const copy: Record<Locale, {
  back: string;
  badge: string;
  title: string;
  subtitle: string;
  yes: string;
  partial: string;
  no: string;
  unanswered: string;
  score: string;
  readiness: string;
  critical: string;
  attention: string;
  ready: string;
  questions: string;
  completed: string;
  actionPlan: string;
  actionSubtitle: string;
  noActions: string;
  articleBreakdown: string;
  export: string;
  saveNote: string;
  saving: string;
  saved: string;
  localOnly: string;
  loginRequired: string;
}> = {
  en: {
    back: 'Back to dashboard', badge: 'EU AI Act Gap Analysis', title: 'Measure your compliance readiness', subtitle: 'Answer a focused questionnaire mapped to the main EU AI Act obligations for high-risk AI systems.', yes: 'Yes', partial: 'Partial', no: 'No', unanswered: 'Unanswered', score: 'Compliance Score', readiness: 'Readiness', critical: 'Critical gaps', attention: 'Needs attention', ready: 'Ready', questions: 'Questions', completed: 'completed', actionPlan: 'Action plan', actionSubtitle: 'Recommended actions generated from your answers.', noActions: 'No critical gaps found yet. Keep your evidence updated.', articleBreakdown: 'Article breakdown', export: 'Save & generate report', saveNote: 'Saves your assessment and creates remediation work when persistence is available.', saving: 'Saving assessment...', saved: 'Assessment saved. Findings and tasks were generated.', localOnly: 'Report generated. Database persistence is not available yet.', loginRequired: 'Sign in to save this assessment.',
  },
  pt: {
    back: 'Voltar ao dashboard', badge: 'Gap Analysis EU AI Act', title: 'Meça sua prontidão de compliance', subtitle: 'Responda um questionário focado nas principais obrigações do EU AI Act para sistemas de IA de alto risco.', yes: 'Sim', partial: 'Parcial', no: 'Não', unanswered: 'Sem resposta', score: 'Score de Compliance', readiness: 'Prontidão', critical: 'Lacunas críticas', attention: 'Precisa atenção', ready: 'Pronto', questions: 'Perguntas', completed: 'respondidas', actionPlan: 'Plano de ação', actionSubtitle: 'Ações recomendadas geradas a partir das suas respostas.', noActions: 'Nenhuma lacuna crítica encontrada ainda. Mantenha as evidências atualizadas.', articleBreakdown: 'Resumo por artigo', export: 'Salvar e gerar relatório', saveNote: 'Salva sua avaliação e cria tarefas de correção quando a persistência estiver disponível.', saving: 'Salvando avaliação...', saved: 'Avaliação salva. Findings e tarefas foram gerados.', localOnly: 'Relatório gerado. Persistência no banco ainda não disponível.', loginRequired: 'Entre na conta para salvar esta avaliação.',
  },
  es: {
    back: 'Volver al panel', badge: 'Gap Analysis EU AI Act', title: 'Mide tu preparación de cumplimiento', subtitle: 'Responde un cuestionario enfocado en las principales obligaciones del EU AI Act para sistemas de IA de alto riesgo.', yes: 'Sí', partial: 'Parcial', no: 'No', unanswered: 'Sin respuesta', score: 'Puntuación de cumplimiento', readiness: 'Preparación', critical: 'Brechas críticas', attention: 'Requiere atención', ready: 'Listo', questions: 'Preguntas', completed: 'respondidas', actionPlan: 'Plan de acción', actionSubtitle: 'Acciones recomendadas generadas a partir de tus respuestas.', noActions: 'No se encontraron brechas críticas aún. Mantén tus evidencias actualizadas.', articleBreakdown: 'Resumen por artículo', export: 'Guardar y generar informe', saveNote: 'Guarda tu evaluación y crea trabajo de remediación cuando la persistencia esté disponible.', saving: 'Guardando evaluación...', saved: 'Evaluación guardada. Se generaron hallazgos y tareas.', localOnly: 'Informe generado. La persistencia en base de datos aún no está disponible.', loginRequired: 'Inicia sesión para guardar esta evaluación.',
  },
  fr: {
    back: 'Retour au tableau de bord', badge: 'Gap Analysis EU AI Act', title: 'Mesurez votre préparation conformité', subtitle: 'Répondez à un questionnaire ciblé sur les principales obligations de l’EU AI Act pour les systèmes IA à haut risque.', yes: 'Oui', partial: 'Partiel', no: 'Non', unanswered: 'Sans réponse', score: 'Score de conformité', readiness: 'Préparation', critical: 'Écarts critiques', attention: 'À surveiller', ready: 'Prêt', questions: 'Questions', completed: 'répondues', actionPlan: 'Plan d’action', actionSubtitle: 'Actions recommandées générées à partir de vos réponses.', noActions: 'Aucun écart critique trouvé pour le moment. Gardez vos preuves à jour.', articleBreakdown: 'Résumé par article', export: 'Enregistrer et générer le rapport', saveNote: 'Enregistre votre évaluation et crée le travail de remédiation lorsque la persistance est disponible.', saving: 'Enregistrement de l’évaluation...', saved: 'Évaluation enregistrée. Les écarts et tâches ont été générés.', localOnly: 'Rapport généré. La persistance en base de données n’est pas encore disponible.', loginRequired: 'Connectez-vous pour enregistrer cette évaluation.',
  },
  it: {
    back: 'Torna alla dashboard', badge: 'Gap Analysis EU AI Act', title: 'Misura la tua prontezza compliance', subtitle: 'Rispondi a un questionario focalizzato sui principali obblighi dell’EU AI Act per sistemi IA ad alto rischio.', yes: 'Sì', partial: 'Parziale', no: 'No', unanswered: 'Senza risposta', score: 'Punteggio compliance', readiness: 'Prontezza', critical: 'Gap critici', attention: 'Richiede attenzione', ready: 'Pronto', questions: 'Domande', completed: 'risposte', actionPlan: 'Piano d’azione', actionSubtitle: 'Azioni consigliate generate dalle tue risposte.', noActions: 'Nessun gap critico trovato. Mantieni aggiornate le evidenze.', articleBreakdown: 'Sintesi per articolo', export: 'Salva e genera report', saveNote: 'Salva la valutazione e crea attività di remediation quando la persistenza è disponibile.', saving: 'Salvataggio valutazione...', saved: 'Valutazione salvata. Findings e attività sono stati generati.', localOnly: 'Report generato. La persistenza nel database non è ancora disponibile.', loginRequired: 'Accedi per salvare questa valutazione.',
  },
  de: {
    back: 'Zurück zum Dashboard', badge: 'EU AI Act Gap Analysis', title: 'Messen Sie Ihre Compliance-Bereitschaft', subtitle: 'Beantworten Sie einen fokussierten Fragebogen zu den wichtigsten EU-AI-Act-Pflichten für Hochrisiko-KI-Systeme.', yes: 'Ja', partial: 'Teilweise', no: 'Nein', unanswered: 'Unbeantwortet', score: 'Compliance-Score', readiness: 'Bereitschaft', critical: 'Kritische Lücken', attention: 'Benötigt Aufmerksamkeit', ready: 'Bereit', questions: 'Fragen', completed: 'beantwortet', actionPlan: 'Aktionsplan', actionSubtitle: 'Empfohlene Maßnahmen basierend auf Ihren Antworten.', noActions: 'Noch keine kritischen Lücken gefunden. Halten Sie Ihre Nachweise aktuell.', articleBreakdown: 'Übersicht nach Artikel', export: 'Speichern und Bericht erstellen', saveNote: 'Speichert die Bewertung und erstellt Remediation-Arbeit, sobald Persistenz verfügbar ist.', saving: 'Bewertung wird gespeichert...', saved: 'Bewertung gespeichert. Findings und Aufgaben wurden erstellt.', localOnly: 'Bericht erstellt. Datenbankpersistenz ist noch nicht verfügbar.', loginRequired: 'Melden Sie sich an, um diese Bewertung zu speichern.',
  },
};

const questions: Question[] = [
  {
    id: 'art9-risk-process', article: 'Article 9',
    category: { en: 'Risk management', pt: 'Gestão de risco', es: 'Gestión de riesgo', fr: 'Gestion des risques', it: 'Gestione del rischio', de: 'Risikomanagement' },
    text: { en: 'Is there a formal AI risk management process?', pt: 'Existe processo formal de gestão de risco de IA?', es: '¿Existe un proceso formal de gestión de riesgos de IA?', fr: 'Existe-t-il un processus formel de gestion des risques IA ?', it: 'Esiste un processo formale di gestione del rischio IA?', de: 'Gibt es einen formalen KI-Risikomanagementprozess?' },
    recommendation: { en: 'Create and document an AI risk management process aligned with Article 9.', pt: 'Crie e documente um processo de gestão de risco de IA alinhado ao Artigo 9.', es: 'Crea y documenta un proceso de gestión de riesgos de IA alineado con el Artículo 9.', fr: 'Créez et documentez un processus de gestion des risques IA aligné sur l’article 9.', it: 'Crea e documenta un processo di gestione del rischio IA allineato all’Articolo 9.', de: 'Erstellen und dokumentieren Sie einen KI-Risikomanagementprozess gemäß Artikel 9.' },
  },
  {
    id: 'art9-mitigation', article: 'Article 9',
    category: { en: 'Risk management', pt: 'Gestão de risco', es: 'Gestión de riesgo', fr: 'Gestion des risques', it: 'Gestione del rischio', de: 'Risikomanagement' },
    text: { en: 'Are mitigation actions documented and reviewed periodically?', pt: 'As ações de mitigação são documentadas e revisadas periodicamente?', es: '¿Las acciones de mitigación están documentadas y se revisan periódicamente?', fr: 'Les actions d’atténuation sont-elles documentées et révisées périodiquement ?', it: 'Le azioni di mitigazione sono documentate e revisionate periodicamente?', de: 'Werden Minderungsmaßnahmen dokumentiert und regelmäßig überprüft?' },
    recommendation: { en: 'Define owners, review dates and evidence for each mitigation action.', pt: 'Defina responsáveis, datas de revisão e evidências para cada ação de mitigação.', es: 'Define responsables, fechas de revisión y evidencias para cada acción de mitigación.', fr: 'Définissez des responsables, dates de revue et preuves pour chaque action.', it: 'Definisci responsabili, date di revisione ed evidenze per ogni azione.', de: 'Definieren Sie Verantwortliche, Prüftermine und Nachweise für jede Maßnahme.' },
  },
  {
    id: 'art10-data-docs', article: 'Article 10',
    category: { en: 'Data governance', pt: 'Governança de dados', es: 'Gobernanza de datos', fr: 'Gouvernance des données', it: 'Governance dei dati', de: 'Daten-Governance' },
    text: { en: 'Are datasets documented, traceable and quality controlled?', pt: 'Os datasets são documentados, rastreáveis e controlados por qualidade?', es: '¿Los datasets están documentados, son trazables y tienen control de calidad?', fr: 'Les jeux de données sont-ils documentés, traçables et contrôlés ?', it: 'I dataset sono documentati, tracciabili e controllati?', de: 'Sind Datensätze dokumentiert, rückverfolgbar und qualitätskontrolliert?' },
    recommendation: { en: 'Create dataset documentation with source, quality checks, bias review and lineage.', pt: 'Crie documentação dos datasets com origem, qualidade, viés e rastreabilidade.', es: 'Crea documentación de datasets con origen, calidad, sesgos y trazabilidad.', fr: 'Créez une documentation des jeux de données avec source, qualité, biais et traçabilité.', it: 'Crea documentazione dei dataset con origine, qualità, bias e tracciabilità.', de: 'Erstellen Sie Datensatzdokumentation mit Quelle, Qualität, Bias-Prüfung und Herkunft.' },
  },
  {
    id: 'art12-logging', article: 'Article 12',
    category: { en: 'Logging', pt: 'Logs', es: 'Registros', fr: 'Journalisation', it: 'Logging', de: 'Protokollierung' },
    text: { en: 'Does the system generate and retain appropriate logs?', pt: 'O sistema gera e armazena logs adequados?', es: '¿El sistema genera y conserva registros adecuados?', fr: 'Le système génère-t-il et conserve-t-il des journaux appropriés ?', it: 'Il sistema genera e conserva log adeguati?', de: 'Erzeugt und speichert das System geeignete Protokolle?' },
    recommendation: { en: 'Implement logging retention, access controls and audit review procedures.', pt: 'Implemente retenção de logs, controle de acesso e revisão de auditoria.', es: 'Implementa retención de logs, control de acceso y revisión de auditoría.', fr: 'Mettez en place conservation des journaux, accès contrôlé et revue d’audit.', it: 'Implementa conservazione dei log, controlli di accesso e revisione audit.', de: 'Implementieren Sie Log-Aufbewahrung, Zugriffskontrollen und Audit-Reviews.' },
  },
  {
    id: 'art13-transparency', article: 'Article 13',
    category: { en: 'Transparency', pt: 'Transparência', es: 'Transparencia', fr: 'Transparence', it: 'Trasparenza', de: 'Transparenz' },
    text: { en: 'Are users informed that they interact with or are impacted by AI?', pt: 'Os utilizadores são informados de que interagem ou são impactados por IA?', es: '¿Los usuarios son informados de que interactúan o son impactados por IA?', fr: 'Les utilisateurs sont-ils informés qu’ils interagissent avec ou sont impactés par l’IA ?', it: 'Gli utenti sono informati che interagiscono con o sono impattati dall’IA?', de: 'Werden Nutzer informiert, dass sie mit KI interagieren oder betroffen sind?' },
    recommendation: { en: 'Prepare user notices, model documentation and transparency statements.', pt: 'Prepare avisos ao usuário, documentação do modelo e declarações de transparência.', es: 'Prepara avisos al usuario, documentación del modelo y declaraciones de transparencia.', fr: 'Préparez avis utilisateurs, documentation modèle et déclarations de transparence.', it: 'Prepara avvisi utente, documentazione modello e dichiarazioni di trasparenza.', de: 'Bereiten Sie Nutzerhinweise, Modelldokumentation und Transparenzangaben vor.' },
  },
  {
    id: 'art14-human-oversight', article: 'Article 14',
    category: { en: 'Human oversight', pt: 'Supervisão humana', es: 'Supervisión humana', fr: 'Supervision humaine', it: 'Supervisione umana', de: 'Menschliche Aufsicht' },
    text: { en: 'Can a qualified human oversee and interrupt automated decisions?', pt: 'Uma pessoa qualificada pode supervisionar e interromper decisões automatizadas?', es: '¿Una persona cualificada puede supervisar e interrumpir decisiones automatizadas?', fr: 'Une personne qualifiée peut-elle superviser et interrompre les décisions automatisées ?', it: 'Una persona qualificata può supervisionare e interrompere decisioni automatizzate?', de: 'Kann eine qualifizierte Person automatisierte Entscheidungen überwachen und stoppen?' },
    recommendation: { en: 'Define human oversight roles, escalation paths and stop procedures.', pt: 'Defina papéis de supervisão humana, escalonamento e procedimentos de interrupção.', es: 'Define roles de supervisión humana, escalado y procedimientos de interrupción.', fr: 'Définissez rôles de supervision, escalade et procédures d’arrêt.', it: 'Definisci ruoli di supervisione, escalation e procedure di blocco.', de: 'Definieren Sie Aufsichtsrollen, Eskalation und Stoppprozesse.' },
  },
  {
    id: 'art15-robustness', article: 'Article 15',
    category: { en: 'Robustness', pt: 'Robustez', es: 'Robustez', fr: 'Robustesse', it: 'Robustezza', de: 'Robustheit' },
    text: { en: 'Are robustness, cybersecurity and incident procedures tested?', pt: 'Robustez, cibersegurança e incidentes são testados?', es: '¿Se prueban robustez, ciberseguridad y procedimientos de incidentes?', fr: 'La robustesse, cybersécurité et procédures d’incident sont-elles testées ?', it: 'Robustezza, cybersecurity e procedure di incidente sono testate?', de: 'Werden Robustheit, Cybersicherheit und Incident Response getestet?' },
    recommendation: { en: 'Set recurring tests for robustness, cybersecurity and incident response.', pt: 'Defina testes recorrentes de robustez, cibersegurança e resposta a incidentes.', es: 'Define pruebas recurrentes de robustez, ciberseguridad y respuesta a incidentes.', fr: 'Mettez en place des tests récurrents de robustesse, cybersécurité et réponse incident.', it: 'Imposta test ricorrenti per robustezza, cybersecurity e risposta agli incidenti.', de: 'Führen Sie regelmäßige Tests für Robustheit, Cybersicherheit und Incident Response ein.' },
  },
];

function answerScore(answer: Answer) {
  if (answer === 'yes') return 100;
  if (answer === 'partial') return 50;
  if (answer === 'no') return 0;
  return 0;
}

function statusForScore(score: number, t: typeof copy.en) {
  if (score >= 80) return { label: t.ready, icon: CheckCircle2, tone: 'text-emerald-300 border-emerald-400/20 bg-emerald-500/10' };
  if (score >= 50) return { label: t.attention, icon: AlertTriangle, tone: 'text-amber-300 border-amber-400/20 bg-amber-500/10' };
  return { label: t.critical, icon: XCircle, tone: 'text-red-300 border-red-400/20 bg-red-500/10' };
}

export default function GapAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const locale = locales.includes(params.locale as Locale) ? (params.locale as Locale) : 'en';
  const t = copy[locale];
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const result = useMemo(() => {
    const completed = questions.filter((q) => answers[q.id]).length;
    const total = questions.length;
    const score = Math.round(questions.reduce((sum, q) => sum + answerScore(answers[q.id] || ''), 0) / total);
    const byArticle = questions.reduce<Record<string, { total: number; score: number; count: number }>>((acc, q) => {
      if (!acc[q.article]) acc[q.article] = { total: 0, score: 0, count: 0 };
      acc[q.article].count += 1;
      acc[q.article].score += answerScore(answers[q.id] || '');
      acc[q.article].total = Math.round(acc[q.article].score / acc[q.article].count);
      return acc;
    }, {});
    const actions = questions
      .filter((q) => answers[q.id] === 'no' || answers[q.id] === 'partial')
      .map((q) => ({
        article: q.article,
        recommendation: q.recommendation[locale],
        severity: answers[q.id] === 'no' ? 'critical' as const : 'medium' as const,
      }));
    const persistedAnswers = questions
      .filter((q) => answers[q.id] === 'yes' || answers[q.id] === 'partial' || answers[q.id] === 'no')
      .map((q) => {
        const answer = answers[q.id] as 'yes' | 'partial' | 'no';
        return {
          question_id: q.id,
          article: q.article,
          category: q.category[locale],
          answer,
          score: answerScore(answer) as 0 | 50 | 100,
          recommendation: q.recommendation[locale],
        };
      });
    return { completed, total, score, byArticle, actions, persistedAnswers };
  }, [answers, locale]);

  const status = statusForScore(result.score, t);
  const StatusIcon = status.icon;

  const downloadReport = () => {
    const lines = [
      'RISCK COMPLY - EU AI Act Gap Analysis',
      `${t.score}: ${result.score}%`,
      `${t.questions}: ${result.completed}/${result.total}`,
      '',
      t.articleBreakdown,
      ...Object.entries(result.byArticle).map(([article, item]) => `${article}: ${item.total}%`),
      '',
      t.actionPlan,
      ...(result.actions.length ? result.actions.map((a) => `${a.article}: ${a.recommendation}`) : [t.noActions]),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'risck-comply-gap-analysis.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateReport = async () => {
    setSaveMessage(null);

    if (!user?.id) {
      setSaveMessage(t.loginRequired);
      downloadReport();
      return;
    }

    setSaving(true);

    try {
      const assessmentResult = await trySaveGapAssessment({
        workspaceId: null,
        userId: user.id,
        locale,
        score: result.score,
        summary: {
          completed: result.completed,
          total: result.total,
          byArticle: result.byArticle,
          openActions: result.actions.length,
        },
        answers: result.persistedAnswers,
      });

      if (assessmentResult.ok) {
        await tryCreateFindingsAndTasks({
          workspaceId: null,
          userId: user.id,
          assessmentId: assessmentResult.assessmentId,
          actions: result.actions,
        });
        setSaveMessage(t.saved);
      } else {
        setSaveMessage(t.localOnly);
      }
    } finally {
      setSaving(false);
      downloadReport();
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.24),transparent_34rem)]" />
      <div className="relative mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <Button variant="ghost" onClick={() => router.push(`/${locale}/dashboard`)} className="mb-6 text-white/70 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t.back}
        </Button>

        <div className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <Badge className="mb-4 border-white/10 bg-white/[0.06] text-white/70">{t.badge}</Badge>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">{t.title}</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-white/58">{t.subtitle}</p>
          </div>

          <Card className="border-white/10 bg-white/[0.045] text-white">
            <CardHeader>
              <CardDescription className="text-white/50">{t.score}</CardDescription>
              <CardTitle className="flex items-end justify-between text-5xl">
                <span>{result.score}%</span>
                <Badge className={`border ${status.tone}`}><StatusIcon className="mr-1 h-3.5 w-3.5" />{status.label}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={result.score} className="h-2" />
              <p className="mt-4 text-sm text-white/48">{result.completed}/{result.total} {t.completed}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="space-y-4">
            {questions.map((q) => (
              <Card key={q.id} className="border-white/10 bg-white/[0.045] text-white">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-blue-400/20 bg-blue-500/10 text-blue-200">{q.article}</Badge>
                    <span className="text-sm text-white/48">{q.category[locale]}</span>
                  </div>
                  <CardTitle className="text-xl">{q.text[locale]}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {(['yes', 'partial', 'no'] as Answer[]).filter(Boolean).map((answer) => (
                      <button
                        key={answer}
                        type="button"
                        onClick={() => setAnswers((current) => ({ ...current, [q.id]: answer }))}
                        className={`rounded-xl border px-4 py-3 text-sm transition ${answers[q.id] === answer ? 'border-white bg-white text-black' : 'border-white/10 bg-white/[0.03] text-white/68 hover:bg-white/[0.08]'}`}
                      >
                        {answer === 'yes' ? t.yes : answer === 'partial' ? t.partial : t.no}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          <aside className="space-y-6">
            <GapActionCenter actions={result.actions} score={result.score} locale={locale} />

            <Card className="border-white/10 bg-white/[0.045] text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />{t.articleBreakdown}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(result.byArticle).map(([article, item]) => (
                  <div key={article}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span>{article}</span>
                      <span className="text-white/58">{item.total}%</span>
                    </div>
                    <Progress value={item.total} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.045] text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />{t.actionPlan}</CardTitle>
                <CardDescription className="text-white/48">{t.actionSubtitle}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.actions.length === 0 ? (
                  <p className="text-sm text-white/55">{t.noActions}</p>
                ) : result.actions.map((action, index) => (
                  <div key={`${action.article}-${index}`} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                    <Badge className={action.severity === 'critical' ? 'mb-2 border-red-400/20 bg-red-500/10 text-red-200' : 'mb-2 border-amber-400/20 bg-amber-500/10 text-amber-200'}>{action.article}</Badge>
                    <p className="text-white/70">{action.recommendation}</p>
                  </div>
                ))}
                <Button onClick={generateReport} disabled={saving} className="mt-4 w-full bg-white text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60">
                  <Download className="mr-2 h-4 w-4" /> {saving ? t.saving : t.export}
                </Button>
                {saveMessage && <p className="text-xs text-white/60">{saveMessage}</p>}
                <p className="text-xs text-white/38">{t.saveNote}</p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
