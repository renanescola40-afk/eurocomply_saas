import Link from 'next/link';
import { redirect } from 'next/navigation';

import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { getCurrentUser } from '@/server/queries/auth';

const baseNews = [
  {
    title: 'CNPD publica novo guia sobre avaliação de impacto de proteção de dados',
    category: 'RGPD',
    country: 'Portugal',
    date: '05/04/2025',
    summary: 'A autoridade portuguesa publicou orientações práticas para empresas que precisam documentar riscos de tratamento de dados pessoais.',
    body: 'A orientação reforça a necessidade de mapear finalidade, base legal, riscos residuais, medidas mitigadoras e evidência de aprovação. Para equipas de compliance, a recomendação é manter uma matriz DPIA atualizada e ligada ao inventário de documentos.',
    source: 'CNPD Portugal',
    author: 'Departamento Jurídico da CNPD',
    site: 'https://www.cnpd.pt',
  },
  {
    title: 'La CNIL annonce des contrôles renforcés sur les transferts de données hors UE',
    category: 'Données',
    country: 'France',
    date: '12/04/2025',
    summary: 'La CNIL intensifie les vérifications concernant les clauses contractuelles types et les analyses de transfert.',
    body: 'Les organisations doivent documenter leurs transferts, revoir les garanties contractuelles et conserver les preuves d’évaluation. Les équipes juridiques devraient prioriser les fournisseurs critiques.',
    source: 'CNIL',
    author: 'Rédaction CNIL',
    site: 'https://www.cnil.fr',
  },
  {
    title: 'EUR-Lex highlights new digital compliance obligations for regulated firms',
    category: 'EU Law',
    country: 'European Union',
    date: '18/04/2025',
    summary: 'European institutions continue aligning digital governance, cybersecurity and reporting expectations across regulated sectors.',
    body: 'The update signals that companies should maintain board-level evidence, supplier oversight and incident response traceability. Compliance teams should review whether risk registers and approval trails are current.',
    source: 'EUR-Lex',
    author: 'European Commission',
    site: 'https://eur-lex.europa.eu',
  },
];

const aiNews = [
  {
    title: 'Banco de Portugal reforça expectativas de governação para entidades reguladas',
    category: 'Governança',
    country: 'Portugal',
    date: '22/04/2025',
    summary: 'A atualização simulada destaca evidência de controlo interno, registo de decisões e rastreabilidade de aprovações.',
    body: 'A notícia reescrita pela IA recomenda que equipas financeiras mantenham atas, políticas e matrizes de risco alinhadas com controlos internos e responsabilidades RACI.',
    source: 'Banco de Portugal',
    author: 'Redação regulatória',
    site: 'https://www.bportugal.pt',
  },
  {
    title: 'ESMA updates supervisory focus for market compliance documentation',
    category: 'Financeiro',
    country: 'European Union',
    date: '24/04/2025',
    summary: 'The simulated update highlights the need for consistent evidence packs, versioned policies and executive oversight.',
    body: 'AI summary: regulated firms should connect risk registers, vendor reviews and document approvals to board-ready compliance reporting.',
    source: 'ESMA',
    author: 'ESMA Communications',
    site: 'https://www.esma.europa.eu',
  },
];

export default async function ComplianceNewsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string; country?: string; category?: string; ai?: string }> }) {
  const { locale } = await params;
  const query = (await searchParams) ?? {};
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const news = query.ai === '1' ? [...aiNews, ...baseNews] : baseNews;
  const term = (query.q ?? '').toLowerCase().trim();
  const country = query.country ?? 'all';
  const category = query.category ?? 'all';

  const filtered = news.filter((item) => {
    const matchesTerm = !term || `${item.title} ${item.summary} ${item.body}`.toLowerCase().includes(term);
    const matchesCountry = country === 'all' || item.country === country;
    const matchesCategory = category === 'all' || item.category === category;
    return matchesTerm && matchesCountry && matchesCategory;
  });

  const countries = Array.from(new Set(news.map((item) => item.country)));
  const categories = Array.from(new Set(news.map((item) => item.category)));

  return (
    <main className="min-h-screen bg-[#f6f3ee] text-slate-950">
      <DashboardCommandNavigation locale={locale} activePage="Notícias" />
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <Link href={`/${locale}/dashboard/organizations/reports-governance`} className="text-sm font-semibold text-slate-600 hover:text-slate-950">
          ← Reports & Governance
        </Link>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-700">AI regulatory news</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">European compliance news</h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            Notícias regulatórias reescritas em linguagem executiva, com fonte, autor, instituição e data original. Idioma principal: {locale === 'fr' ? 'francês' : locale === 'es' ? 'espanhol' : locale === 'pt' ? 'português' : 'inglês'}.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/${locale}/notificacoes`} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg">
              Ver notificações
            </Link>
            <Link href={`/${locale}/dashboard/organizations/reports-governance/news?ai=1`} className="rounded-full border border-slate-300 px-5 py-3 text-sm font-bold transition hover:bg-slate-100">
              Atualizar notícias com IA
            </Link>
          </div>
        </section>

        <form className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-4" action={`/${locale}/dashboard/organizations/reports-governance/news`}>
          <input name="q" defaultValue={query.q ?? ''} placeholder="Buscar palavra-chave" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500" />
          <select name="country" defaultValue={country} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500">
            <option value="all">Todos os países</option>
            {countries.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select name="category" defaultValue={category} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500">
            <option value="all">Todas as categorias</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg" type="submit">Filtrar notícias</button>
        </form>

        {query.ai === '1' ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">IA simulada adicionou {aiNews.length} notícias novas e preparou notificações de atualização regulatória.</p> : null}

        <section className="grid gap-4 md:grid-cols-3">
          {filtered.map((item) => (
            <article key={item.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{item.category}</span>
                <span className="text-xs font-semibold text-slate-500">{item.country}</span>
              </div>
              <h2 className="mt-4 text-xl font-black">{item.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{item.summary}</p>
              <details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 open:bg-white">
                <summary className="cursor-pointer text-sm font-bold text-slate-950">Ler mais</summary>
                <p className="mt-3 text-sm leading-6 text-slate-700">{item.body}</p>
                <footer className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-xs text-slate-500">
                  <p>📌 Fonte original: {item.source}</p>
                  <p>✍️ Autor: {item.author}</p>
                  <p>🔗 Site: {item.site}</p>
                  <p>📅 Data da publicação original: {item.date}</p>
                  <p>🏷️ País/Instituição relacionada: {item.country}</p>
                </footer>
              </details>
            </article>
          ))}
        </section>

        {filtered.length === 0 ? <p className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">Nenhuma notícia encontrada com estes filtros.</p> : null}
      </div>
    </main>
  );
}
