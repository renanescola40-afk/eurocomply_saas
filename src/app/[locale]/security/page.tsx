import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PublicFooter } from '@/components/marketing/public-footer';
import { isSupportedLocale, type SupportedLocale } from '@/lib/i18n/locales';

type SecurityCopy = {
  title: string;
  subtitle: string;
  back: string;
  sections: Array<{ title: string; description: string; items: string[] }>;
};

const copy: Record<SupportedLocale, SecurityCopy> = {
  en: {
    title: 'Security at EuroComply',
    subtitle: 'Current controls and evidence boundaries for enterprise buyers. This page avoids unsupported compliance claims.',
    back: 'Back to Trust Center',
    sections: [
      { title: 'Identity and access', description: 'Authentication is handled through Supabase Auth and protected application routes.', items: ['Session-based access controls', 'Protected dashboard routes', 'Role-aware organization workflows'] },
      { title: 'RBAC and tenant boundaries', description: 'Organization access is role-based and designed to work with database isolation controls.', items: ['Owner, admin, editor, member and viewer roles', 'Server-side permission checks', 'RLS migrations and validation evidence'] },
      { title: 'Audit and monitoring', description: 'Critical operations are intended to create audit events and release evidence.', items: ['Audit event code paths', 'Sanitized metadata', 'Release gates for trust documentation'] },
      { title: 'Current non-claims', description: 'EuroComply does not currently claim SOC 2, ISO 27001 certification or completed third-party penetration testing.', items: ['Use designed-to-support language', 'Attach evidence before stronger claims', 'Responsible disclosure: renansilva2002@gmail.com'] },
    ],
  },
  pt: {
    title: 'Segurança no EuroComply',
    subtitle: 'Controlos atuais e limites de evidência para compradores enterprise, sem claims não suportadas.',
    back: 'Voltar ao Centro de Confiança',
    sections: [
      { title: 'Identidade e acesso', description: 'A autenticação usa Supabase Auth e rotas protegidas.', items: ['Sessões autenticadas', 'Rotas privadas protegidas', 'Workflows por organização'] },
      { title: 'RBAC e tenant boundaries', description: 'O acesso por organização é baseado em funções e desenhado para funcionar com RLS.', items: ['Funções owner, admin, editor, member e viewer', 'Checks server-side', 'Migrações RLS e evidência'] },
      { title: 'Auditoria e monitoring', description: 'Operações críticas devem gerar eventos e evidência de release.', items: ['Eventos de auditoria', 'Metadata sanitizada', 'Gates para documentação trust'] },
      { title: 'Non-claims atuais', description: 'O EuroComply não afirma SOC 2, certificação ISO 27001 ou teste externo concluído.', items: ['Usar linguagem designed-to-support', 'Anexar evidência antes de claims fortes', 'Disclosure: renansilva2002@gmail.com'] },
    ],
  },
  es: {
    title: 'Seguridad en EuroComply',
    subtitle: 'Controles actuales y límites de evidencia para compradores enterprise.',
    back: 'Volver al Centro de Confianza',
    sections: [
      { title: 'Identidad y acceso', description: 'La autenticación usa Supabase Auth y rutas protegidas.', items: ['Sesiones autenticadas', 'Rutas privadas protegidas', 'Flujos por organización'] },
      { title: 'RBAC y límites tenant', description: 'El acceso por organización es basado en roles y diseñado para funcionar con RLS.', items: ['Roles owner, admin, editor, member y viewer', 'Checks server-side', 'Migraciones RLS y evidencia'] },
      { title: 'Auditoría y monitoreo', description: 'Operaciones críticas deben generar eventos y evidencia de release.', items: ['Eventos de auditoría', 'Metadatos sanitizados', 'Gates de documentación trust'] },
      { title: 'Non-claims actuales', description: 'EuroComply no afirma SOC 2, certificación ISO 27001 o revisión externa completada.', items: ['Usar lenguaje designed-to-support', 'Adjuntar evidencia antes de claims fuertes', 'Disclosure: renansilva2002@gmail.com'] },
    ],
  },
  fr: {
    title: 'Sécurité chez EuroComply',
    subtitle: 'Contrôles actuels et limites de preuve pour acheteurs enterprise.',
    back: 'Retour au Centre de Confiance',
    sections: [
      { title: 'Identité et accès', description: 'L’authentification utilise Supabase Auth et des routes protégées.', items: ['Sessions authentifiées', 'Routes privées protégées', 'Workflows par organisation'] },
      { title: 'RBAC et limites tenant', description: 'L’accès organisationnel est basé sur les rôles et conçu avec RLS.', items: ['Rôles owner, admin, editor, member et viewer', 'Contrôles server-side', 'Migrations RLS et preuves'] },
      { title: 'Audit et monitoring', description: 'Les opérations critiques doivent générer événements et preuves de release.', items: ['Événements d’audit', 'Métadonnées sanitizées', 'Gates de documentation trust'] },
      { title: 'Non-claims actuels', description: 'EuroComply ne revendique pas SOC 2, certification ISO 27001 ou revue externe terminée.', items: ['Utiliser designed-to-support', 'Joindre preuve avant claim forte', 'Disclosure: renansilva2002@gmail.com'] },
    ],
  },
  it: {
    title: 'Sicurezza in EuroComply',
    subtitle: 'Controlli attuali e limiti di evidenza per buyer enterprise.',
    back: 'Torna al Centro Fiducia',
    sections: [
      { title: 'Identità e accesso', description: 'Autenticazione con Supabase Auth e rotte protette.', items: ['Sessioni autenticate', 'Rotte private protette', 'Workflow per organizzazione'] },
      { title: 'RBAC e limiti tenant', description: 'Accesso per organizzazione basato su ruoli e progettato con RLS.', items: ['Ruoli owner, admin, editor, member e viewer', 'Controlli server-side', 'Migrazioni RLS ed evidenza'] },
      { title: 'Audit e monitoring', description: 'Operazioni critiche devono generare eventi ed evidenza di release.', items: ['Eventi audit', 'Metadati sanitizzati', 'Gate documentazione trust'] },
      { title: 'Non-claim attuali', description: 'EuroComply non dichiara SOC 2, certificazione ISO 27001 o review esterna completata.', items: ['Usare designed-to-support', 'Allegare evidenza prima di claim forti', 'Disclosure: renansilva2002@gmail.com'] },
    ],
  },
  de: {
    title: 'Security bei EuroComply',
    subtitle: 'Aktuelle Kontrollen und Evidenzgrenzen für Enterprise Buyer.',
    back: 'Zurück zum Trust Center',
    sections: [
      { title: 'Identität und Zugriff', description: 'Authentifizierung nutzt Supabase Auth und geschützte Routen.', items: ['Authentifizierte Sessions', 'Geschützte private Routen', 'Workflows je Organisation'] },
      { title: 'RBAC und Tenant-Grenzen', description: 'Organisationszugriff ist rollenbasiert und für RLS ausgelegt.', items: ['Rollen owner, admin, editor, member und viewer', 'Server-side Checks', 'RLS Migrationen und Evidenz'] },
      { title: 'Audit und Monitoring', description: 'Kritische Operationen sollen Events und Release Evidence erzeugen.', items: ['Audit Events', 'Bereinigte Metadaten', 'Trust-Dokumentations-Gates'] },
      { title: 'Aktuelle Non-Claims', description: 'EuroComply beansprucht derzeit weder SOC 2, ISO 27001-Zertifizierung noch abgeschlossene externe Prüfung.', items: ['Designed-to-support Sprache verwenden', 'Evidenz vor stärkeren Claims anhängen', 'Disclosure: renansilva2002@gmail.com'] },
    ],
  },
};

export default async function SecurityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const page = copy[locale];

  return (
    <main className="min-h-screen bg-[#0A0A0F] text-white">
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <Link href={`/${locale}/trust`} className="text-sm text-white/70 hover:text-white">← {page.back}</Link>
          <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-[-0.05em]">{page.title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">{page.subtitle}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-6 pb-20 md:grid-cols-2">
        {page.sections.map((section) => (
          <article key={section.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">{section.description}</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {section.items.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </article>
        ))}
      </section>

      <PublicFooter locale={locale} />
    </main>
  );
}
