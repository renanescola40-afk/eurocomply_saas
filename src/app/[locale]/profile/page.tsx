'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { ArrowRight, Bell, Building2, CheckCircle2, Crown, LockKeyhole, Mail, Plus, Save, Trash2, UploadCloud, UsersRound } from 'lucide-react';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const defaultCompany = {
  legalName: 'EuroComply Portugal, Lda.',
  tradeName: 'EuroComply',
  email: 'compliance@eurocomply.eu',
  phone: '+351 910 000 000',
  street: 'Avenida da Liberdade',
  number: '110',
  postalCode: '1250-146',
  city: 'Lisboa',
  logoUrl: 'https://dummyimage.com/180x180/111827/ffffff&text=EC',
  nifPortugal: '509442013',
};

const countryTemplates = [
  'Espanha — NIF/CIF',
  'França — SIRET/SIREN',
  'Alemanha — Steuernummer',
  'Itália — Partita IVA',
  'Holanda — BTW-nummer',
  "Bélgica — Numéro d'entreprise",
];

const initialEuropeanNifs = [
  { id: crypto.randomUUID(), country: 'Espanha — NIF/CIF', value: 'B12345678' },
  { id: crypto.randomUUID(), country: 'França — SIRET/SIREN', value: '123 456 789 00012' },
];

const initialEmployees = [
  { id: crypto.randomUUID(), name: 'Ana Martins', email: 'ana@eurocomply.eu', role: 'Admin', status: 'ativo' },
  { id: crypto.randomUUID(), name: 'Miguel Costa', email: 'miguel@eurocomply.eu', role: 'Visualizador', status: 'pendente' },
];

function validatePortugueseNif(nif: string) {
  const clean = nif.replace(/\D/g, '');
  if (!/^\d{9}$/.test(clean)) return false;
  const sum = clean
    .slice(0, 8)
    .split('')
    .reduce((acc, digit, index) => acc + Number(digit) * (9 - index), 0);
  const check = 11 - (sum % 11);
  const expected = check >= 10 ? 0 : check;
  return expected === Number(clean[8]);
}

export default function ProfilePage({ params }: { params: { locale: string } }) {
  const [company, setCompany] = useState(defaultCompany);
  const [plan, setPlan] = useState<'Básico' | 'Pro' | 'Enterprise'>('Básico');
  const [nifs, setNifs] = useState(initialEuropeanNifs);
  const [employees, setEmployees] = useState(initialEmployees);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Editor');
  const [saved, setSaved] = useState(false);

  const isEnterprise = plan === 'Enterprise';
  const isValidNif = useMemo(() => validatePortugueseNif(company.nifPortugal), [company.nifPortugal]);

  function updateCompany(field: keyof typeof company, value: string) {
    setCompany((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  function addNif() {
    setNifs((current) => [...current, { id: crypto.randomUUID(), country: 'Outro país europeu', value: '' }]);
  }

  function updateNif(id: string, field: 'country' | 'value', value: string) {
    setNifs((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  function removeNif(id: string) {
    setNifs((current) => current.filter((item) => item.id !== id));
  }

  function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!isValidNif) return;
    setSaved(true);
  }

  function inviteEmployee() {
    if (!isEnterprise || !inviteEmail.trim()) return;
    setEmployees((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: inviteRole,
        status: 'pendente',
      },
    ]);
    setInviteEmail('');
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.13),_transparent_34%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.32))]">
      <DashboardCommandNavigation locale={params.locale} activePage="Perfil" />

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8 md:py-12">
        <section className="rounded-[2rem] border bg-background/88 p-6 shadow-xl shadow-primary/5 backdrop-blur md:p-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge className="rounded-full px-3 py-1 uppercase tracking-[0.18em]">Perfil da empresa</Badge>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">Dados, plano e equipa.</h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">Gerencie a identidade fiscal europeia, dados comerciais, notificações e permissões colaborativas do workspace EuroComply.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['Básico', 'Pro', 'Enterprise'] as const).map((item) => (
                <button key={item} type="button" onClick={() => setPlan(item)} className={`rounded-full border px-4 py-2 text-sm font-medium transition ${plan === item ? 'border-primary bg-primary text-primary-foreground shadow-lg' : 'bg-background hover:bg-muted'}`}>
                  Simular {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <form id="company-data" onSubmit={saveProfile} className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[2rem] border bg-background/88 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Building2 className="h-5 w-5" /></div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Dados da empresa</h2>
                <p className="text-sm text-muted-foreground">Editável inline. O NIF português é obrigatório e validado.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                ['Razão Social', 'legalName'],
                ['Nome Comercial', 'tradeName'],
                ['Email da empresa', 'email'],
                ['Telefone', 'phone'],
                ['Rua', 'street'],
                ['Número', 'number'],
                ['Código Postal', 'postalCode'],
                ['Cidade', 'city'],
                ['Logo da empresa URL', 'logoUrl'],
              ].map(([label, field]) => (
                <label key={field} className={field === 'logoUrl' ? 'md:col-span-2' : ''}>
                  <span className="text-sm font-medium">{label}</span>
                  <input value={company[field as keyof typeof company]} onChange={(event) => updateCompany(field as keyof typeof company, event.target.value)} className="mt-1 w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" />
                </label>
              ))}

              <label className="md:col-span-2">
                <span className="text-sm font-medium">NIF Portugal obrigatório</span>
                <input value={company.nifPortugal} onChange={(event) => updateCompany('nifPortugal', event.target.value)} className={`mt-1 w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition focus:ring-4 ${isValidNif ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/10' : 'border-red-500/60 focus:border-red-500 focus:ring-red-500/10'}`} />
                <p className={`mt-2 text-xs ${isValidNif ? 'text-emerald-600' : 'text-red-600'}`}>{isValidNif ? 'NIF português válido.' : 'Digite um NIF português válido com 9 dígitos.'}</p>
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="submit" disabled={!isValidNif} className="rounded-full"><Save className="h-4 w-4" /> Guardar alterações</Button>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => updateCompany('logoUrl', 'https://dummyimage.com/180x180/2563eb/ffffff&text=Logo')}><UploadCloud className="h-4 w-4" /> Simular upload de logo</Button>
              {saved ? <span className="inline-flex items-center gap-2 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Alterações guardadas no navegador.</span> : null}
            </div>
          </section>

          <aside id="plan" className="space-y-6">
            <section className="rounded-[2rem] border bg-background/88 p-6 shadow-sm backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Plano atual</p>
                  <h2 className="mt-1 text-3xl font-semibold">{plan}</h2>
                </div>
                <Badge className={`rounded-full ${isEnterprise ? 'bg-emerald-600' : ''}`}><Crown className="mr-1 h-3.5 w-3.5" /> {isEnterprise ? 'Enterprise liberado' : 'Upgrade disponível'}</Badge>
              </div>
              {isEnterprise ? (
                <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                  <li>✅ Múltiplos NIFs europeus</li>
                  <li>✅ Convite de funcionários</li>
                  <li>✅ Relatórios avançados e suporte prioritário</li>
                </ul>
              ) : (
                <div className="mt-5 rounded-2xl bg-primary/10 p-4 text-sm leading-6 text-primary">
                  O plano {plan} cobre o essencial. Enterprise desbloqueia colaboração, NIFs europeus ampliados, relatórios avançados e suporte prioritário para acelerar implementação.
                </div>
              )}
              <Button asChild className="mt-5 w-full rounded-full">
                <Link href={`/${params.locale}/pricing`}>Comparar planos <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </section>

            <section id="notifications" className="rounded-[2rem] border bg-background/88 p-6 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3"><Bell className="h-5 w-5 text-primary" /><h2 className="text-xl font-semibold">Notificações</h2></div>
              <div className="mt-4 space-y-3 text-sm">
                {['Prazos de documentos', 'Alertas de risco', 'Resumo executivo semanal'].map((item) => (
                  <label key={item} className="flex items-center justify-between rounded-2xl border bg-muted/20 px-4 py-3">
                    <span>{item}</span><input type="checkbox" defaultChecked className="h-4 w-4 accent-primary" />
                  </label>
                ))}
              </div>
            </section>
          </aside>
        </form>

        <section className="rounded-[2rem] border bg-background/88 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">NIFs de outros países europeus</h2>
              <p className="mt-1 text-sm text-muted-foreground">Adicione Espanha, França, Alemanha, Itália, Holanda, Bélgica ou qualquer outro identificador fiscal europeu.</p>
            </div>
            <Button type="button" onClick={addNif} variant="outline" className="rounded-full"><Plus className="h-4 w-4" /> Adicionar país</Button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {nifs.map((nif) => (
              <div key={nif.id} className="rounded-2xl border bg-muted/20 p-4">
                <select value={nif.country} onChange={(event) => updateNif(nif.id, 'country', event.target.value)} className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                  {[...countryTemplates, 'Outro país europeu'].map((country) => <option key={country}>{country}</option>)}
                </select>
                <div className="mt-3 flex gap-2">
                  <input value={nif.value} onChange={(event) => updateNif(nif.id, 'value', event.target.value)} placeholder="Número fiscal" className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  <button type="button" onClick={() => removeNif(nif.id)} className="rounded-xl border px-3 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="employees" className="rounded-[2rem] border bg-background/88 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary"><UsersRound className="h-5 w-5" /></div>
            <div><h2 className="text-2xl font-semibold tracking-tight">Gestão de funcionários</h2><p className="text-sm text-muted-foreground">Convites são exclusivos do plano Enterprise.</p></div>
          </div>

          {isEnterprise ? (
            <div className="mt-6 space-y-5">
              <div className="grid gap-3 rounded-2xl border bg-muted/20 p-4 md:grid-cols-[1fr_220px_auto]">
                <input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} type="email" placeholder="email@empresa.eu" className="rounded-xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
                <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)} className="rounded-xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary"><option>Admin</option><option>Editor</option><option>Visualizador</option></select>
                <Button type="button" onClick={inviteEmployee} className="rounded-xl"><Mail className="h-4 w-4" /> Convidar funcionário</Button>
              </div>
              <div className="overflow-hidden rounded-2xl border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-muted-foreground"><tr><th className="p-3">Nome</th><th className="p-3">Email</th><th className="p-3">Permissão</th><th className="p-3">Status</th></tr></thead>
                  <tbody>{employees.map((employee) => <tr key={employee.id} className="border-t"><td className="p-3 font-medium">{employee.name}</td><td className="p-3 text-muted-foreground">{employee.email}</td><td className="p-3">{employee.role}</td><td className="p-3"><Badge variant="outline" className="rounded-full">{employee.status}</Badge></td></tr>)}</tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-primary/20 bg-primary/10 p-6">
              <div className="flex items-start gap-3"><LockKeyhole className="mt-1 h-5 w-5 text-primary" /><div><h3 className="font-semibold">🔒 Upgrade para o plano Enterprise e convide até 10 funcionários para colaborar na implementação dos documentos</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Ideal para equipas com Legal, Compliance, Security e Finance trabalhando no mesmo programa.</p></div></div>
              <Button asChild className="mt-5 rounded-full"><Link href={`/${params.locale}/pricing`}>Fazer upgrade <ArrowRight className="h-4 w-4" /></Link></Button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
