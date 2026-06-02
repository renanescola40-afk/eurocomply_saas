'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Shield, Lock, Globe, FileText, BarChart3, CreditCard, ChevronRight,
  ArrowRight, Award, Database, Layers, FileCheck, Package, Download,
  RefreshCw, Menu, X, Eye, EyeOff, Activity, CheckCircle, Scale, Building2,
  Sparkles, Radar, Fingerprint, LineChart, Workflow
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useParams } from 'next/navigation';

const capabilityRows = [
  { icon: Scale, titleKey: 'landing.capRows.eaiAct.title', textKey: 'landing.capRows.eaiAct.text' },
  { icon: FileCheck, titleKey: 'landing.capRows.policy.title', textKey: 'landing.capRows.policy.text' },
  { icon: Database, titleKey: 'landing.capRows.registry.title', textKey: 'landing.capRows.registry.text' },
  { icon: Package, titleKey: 'landing.capRows.procurement.title', textKey: 'landing.capRows.procurement.text' },
];

const modules = [
  { icon: BarChart3, labelKey: 'landing.modules.compliance', value: '86%', detailKey: 'landing.modules.complianceDetail' },
  { icon: Shield, labelKey: 'landing.modules.systems', value: '42', detailKey: 'landing.modules.systemsDetail' },
  { icon: FileText, labelKey: 'landing.modules.documents', value: '128', detailKey: 'landing.modules.documentsDetail' },
  { icon: Activity, labelKey: 'landing.modules.signals', value: '12', detailKey: 'landing.modules.signalsDetail' },
];

const pricingPlans = [
  { nameKey: 'landing.pricing.starter.name', price: '€49', descriptionKey: 'landing.pricing.starter.description', featuresKey: 'landing.pricing.starter.features', ctaKey: 'landing.pricing.starter.cta', highlight: false },
  { nameKey: 'landing.pricing.growth.name', price: '€199', descriptionKey: 'landing.pricing.growth.description', featuresKey: 'landing.pricing.growth.features', ctaKey: 'landing.pricing.growth.cta', highlight: true },
  { nameKey: 'landing.pricing.enterprise.name', price: '€799', descriptionKey: 'landing.pricing.enterprise.description', featuresKey: 'landing.pricing.enterprise.features', ctaKey: 'landing.pricing.enterprise.cta', highlight: false },
];

const enterpriseLogos = ['Nordline Bank', 'Asterion Cloud', 'HelioGrid', 'VantaWorks', 'Meridian AI'];
const companySizes = [
  { value: '1-10', labelKey: 'onboarding.companySize.s1' },
  { value: '11-50', labelKey: 'onboarding.companySize.s2' },
  { value: '51-200', labelKey: 'onboarding.companySize.s3' },
  { value: '201-1000', labelKey: 'onboarding.companySize.s4' },
  { value: '1000+', labelKey: 'onboarding.companySize.s5' },
];
const industries = [
  { value: 'tech', labelKey: 'onboarding.industry.tech' },
  { value: 'finance', labelKey: 'onboarding.industry.finance' },
  { value: 'healthcare', labelKey: 'onboarding.industry.healthcare' },
  { value: 'retail', labelKey: 'onboarding.industry.retail' },
  { value: 'manufacturing', labelKey: 'onboarding.industry.manufacturing' },
  { value: 'other', labelKey: 'onboarding.industry.other' },
];

export default function LandingPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = (params.locale as string) ?? 'en';
  const dashboardPath = `/${locale}/dashboard`;

  const { user, signInWithEmail, signUpWithEmail, signInWithGoogle, loading: authLoading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoadingState, setAuthLoadingState] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<'auth' | 'profile'>('auth');
  const [profileData, setProfileData] = useState({ fullName: '', companyName: '', companySize: '', industry: '' });
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  const openAuth = (mode: 'login' | 'register' = 'register') => {
    if (user) { window.location.href = dashboardPath; return; }
    setAuthMode(mode);
    setOnboardingStep('auth');
    setShowAuthModal(true);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoadingState(true);
    const result = authMode === 'login'
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(email, password, { name, company_name: companyName });
    setAuthLoadingState(false);
    if (result.error) { setAuthError(result.error.message); return; }
    if (authMode === 'register') {
      setProfileData({ ...profileData, fullName: name, companyName });
      setOnboardingStep('profile');
    } else {
      window.location.href = dashboardPath;
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError(null);
    const { error } = await signInWithGoogle();
    if (error) setAuthError(error.message);
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setAuthError(null);
    setOnboardingLoading(true);
    try {
      await supabase.from('profiles').upsert({ id: user.id, full_name: profileData.fullName, email: user.email, onboarding_completed: true, updated_at: new Date().toISOString() });
      const { data: workspace, error: workspaceError } = await supabase.from('workspaces').insert({ name: profileData.companyName || 'My Workspace', slug: `${(profileData.companyName || 'workspace').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${user.id.slice(0, 8)}`, created_by: user.id, industry: profileData.industry, company_size: profileData.companySize }).select().maybeSingle();
      if (workspaceError) throw workspaceError;
      if (!workspace) throw new Error('Workspace not created');
      await supabase.from('workspace_members').insert({ workspace_id: workspace.id, user_id: user.id, email: user.email, role: 'owner', status: 'active' });
      toast.success(t('auth.successWorkspace'));
      window.location.href = dashboardPath;
    } catch {
      setAuthError(t('auth.errorOnboarding'));
      toast.error(t('auth.errorCreating'));
    } finally {
      setOnboardingLoading(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-[#F9FAFB]">
      <div className="pointer-events-none fixed inset-0 z-0 tech-grid opacity-70" />
      <div className="pointer-events-none fixed left-1/2 top-0 z-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[#2563EB]/20 blur-[120px]" />

      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#050505]/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="group flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] shadow-2xl shadow-blue-500/10">
              <Fingerprint className="h-4 w-4 text-[#F9FAFB]" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold tracking-tight">EuroComply AI</p>
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">AI Governance</p>
            </div>
          </button>

          <div className="hidden items-center gap-8 text-sm text-white/58 md:flex">
            <a href="#platform" className="transition hover:text-white">{t('landing.nav.platform')}</a>
            <a href="#governance" className="transition hover:text-white">{t('landing.nav.governance')}</a>
            <a href="#pricing" className="transition hover:text-white">{t('landing.nav.pricing')}</a>
            <button onClick={() => openAuth('login')} className="transition hover:text-white">{t('landing.nav.login')}</button>
            <Button onClick={() => openAuth('register')} className="rounded-full bg-white text-black hover:bg-white/90">{t('landing.nav.cta')}</Button>
            <LanguageSwitcher variant="inline" />
          </div>

          <div className="flex items-center gap-3 md:hidden">
            <LanguageSwitcher variant="inline" />
            <button className="ml-1" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-white/10 bg-[#050505] px-5 py-4 md:hidden">
            <div className="flex flex-col gap-4 text-sm text-white/70">
              <a href="#platform" onClick={() => setMobileMenuOpen(false)}>{t('landing.nav.platform')}</a>
              <a href="#governance" onClick={() => setMobileMenuOpen(false)}>{t('landing.nav.governance')}</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>{t('landing.nav.pricing')}</a>
              <Button onClick={() => { openAuth('register'); setMobileMenuOpen(false); }} className="bg-white text-black">{t('landing.nav.cta')}</Button>
            </div>
          </div>
        )}
      </nav>

      <section className="relative z-10 min-h-screen pt-28 lg:pt-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_20%,rgba(37,99,235,0.22),transparent_34rem)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 pb-24 lg:grid-cols-[0.86fr_1.14fr] lg:px-8">
          <div className="max-w-2xl">
            <Badge className="mb-7 rounded-full border-white/10 bg-white/[0.06] px-4 py-2 text-white/78 hover:bg-white/[0.08]">{t('landing.badge')}</Badge>
            <h1 className="text-balance text-5xl font-semibold tracking-[-0.075em] text-white sm:text-7xl lg:text-8xl">{t('landing.heroTitle')}</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-white/58">{t('landing.heroSubtitle')}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => openAuth('register')} size="lg" className="h-12 rounded-full bg-white px-7 text-black hover:bg-white/90">{t('landing.cta.start')}<ChevronRight className="ml-2 h-4 w-4" /></Button>
              <Button onClick={() => openAuth('login')} size="lg" variant="outline" className="h-12 rounded-full border-white/15 bg-white/[0.03] px-7 text-white hover:bg-white/[0.08] hover:text-white">{t('landing.cta.demo')}<ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
            <div className="mt-10 grid max-w-lg grid-cols-2 gap-3 text-xs text-white/52 sm:grid-cols-4">
              {[
                { label: t('landing.badges.gdpr'), Icon: Shield },
                { label: t('landing.badges.euHost'), Icon: Globe },
                { label: t('landing.badges.auditLogs'), Icon: Lock },
                { label: t('landing.badges.soc'), Icon: Award },
              ].map(({ label, Icon }) => (
                <div key={label} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
                  <Icon className="h-3.5 w-3.5 text-[#10B981]" />{label}
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[620px] lg:min-h-[720px]">
            <div className="absolute left-8 top-8 h-24 w-24 rounded-full bg-[#2563EB]/20 blur-3xl" />
            <div className="absolute right-12 top-20 h-32 w-32 rounded-full bg-[#10B981]/10 blur-3xl" />
            <div className="premium-shell animate-float-slow relative mx-auto w-full max-w-[760px] rounded-[2rem] p-3">
              <div className="rounded-[1.55rem] border border-white/10 bg-[#070A11] p-4">
                <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-400/70" />
                    <span className="h-3 w-3 rounded-full bg-yellow-400/70" />
                    <span className="h-3 w-3 rounded-full bg-green-400/70" />
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/50">{t('landing.console.title')}</div>
                </div>
                <div className="grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
                  <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <p className="text-xs uppercase tracking-[0.26em] text-white/38">{t('landing.console.readiness')}</p>
                    <div className="text-5xl font-semibold tracking-tight">86%</div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[86%] rounded-full bg-gradient-to-r from-[#2563EB] to-[#10B981]" /></div>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {['Policy', 'Inventory', 'Audit', 'Legal'].map((item) => (
                        <div key={item} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/58">
                          <CheckCircle className="mb-2 h-3.5 w-3.5 text-[#10B981]" />{item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="mb-5 flex items-center justify-between">
                      <p className="text-sm font-medium">{t('landing.console.impactMap')}</p>
                      <Badge className="bg-[#2563EB]/18 text-blue-100">{t('landing.console.updated')}</Badge>
                    </div>
                    <div className="space-y-3">
                      {[t('landing.console.row1'), t('landing.console.row2'), t('landing.console.row3'), t('landing.console.row4')].map((row, index) => (
                        <div key={row} className="group flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 transition hover:border-[#2563EB]/45 hover:bg-[#2563EB]/10">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06]"><Radar className="h-4 w-4 text-white/70" /></div>
                            <span className="text-sm text-white/76">{row}</span>
                          </div>
                          <span className="text-xs text-white/40">{t('landing.console.risk')} {index === 0 ? t('landing.console.high') : index === 1 ? t('landing.console.limited') : t('landing.console.minimal')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-4">
                  {modules.map((metric) => (
                    <div key={metric.labelKey} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                      <metric.icon className="mb-4 h-4 w-4 text-[#2563EB]" />
                      <p className="text-2xl font-semibold">{metric.value}</p>
                      <p className="mt-1 text-xs text-white/42">{t(metric.labelKey)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="premium-card animate-pulse-border absolute -left-2 top-24 hidden w-64 rounded-2xl p-4 lg:block">
              <p className="text-xs uppercase tracking-[0.24em] text-white/38">{t('landing.tracker.badge')}</p>
              <p className="mt-3 text-sm text-white/80">{t('landing.tracker.text')}</p>
            </div>
            <div className="premium-card absolute bottom-12 right-0 hidden w-72 rounded-2xl p-4 lg:block">
              <p className="text-xs uppercase tracking-[0.24em] text-white/38">{t('landing.procurement.badge')}</p>
              <p className="mt-3 text-sm text-white/80">{t('landing.procurement.text')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-y border-white/10 bg-white/[0.025] py-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 lg:px-8">
          <p className="text-xs uppercase tracking-[0.34em] text-white/32">{t('landing.socialProof.title')}</p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {enterpriseLogos.map((logo) => (
              <div key={logo} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5 text-center text-sm font-medium text-white/42">{logo}</div>
            ))}
          </div>
        </div>
      </section>

      <section id="platform" className="relative z-10 mx-auto grid max-w-7xl gap-12 px-5 py-28 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div className="sticky top-28 h-fit">
          <Badge className="rounded-full border-white/10 bg-white/[0.05] text-white/70">{t('landing.platform.badge')}</Badge>
          <h2 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">{t('landing.platform.title')}</h2>
          <p className="mt-5 text-lg leading-8 text-white/52">{t('landing.platform.subtitle')}</p>
        </div>
        <div className="space-y-4">
          {capabilityRows.map((item, index) => (
            <div key={item.titleKey} className="premium-card premium-card-hover grid gap-5 rounded-3xl p-6 md:grid-cols-[auto_1fr_auto] md:items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]"><item.icon className="h-5 w-5 text-[#2563EB]" /></div>
              <div>
                <h3 className="text-xl font-medium">{t(item.titleKey)}</h3>
                <p className="mt-2 text-sm leading-6 text-white/52">{t(item.textKey)}</p>
              </div>
              <span className="font-mono text-xs text-white/28">0{index + 1}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="governance" className="relative z-10 px-5 py-24 lg:px-8">
        <div className="premium-shell mx-auto max-w-7xl overflow-hidden rounded-[2rem] p-8 md:p-12">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center">
            <div>
              <Badge className="rounded-full bg-[#2563EB]/18 text-blue-100">{t('landing.monitoring.badge')}</Badge>
              <h2 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">{t('landing.monitoring.title')}</h2>
              <p className="mt-5 text-lg leading-8 text-white/52">{t('landing.monitoring.subtitle')}</p>
              <div className="mt-8 grid gap-3 text-sm text-white/58">
                {[t('landing.monitoring.bullet1'), t('landing.monitoring.bullet2'), t('landing.monitoring.bullet3')].map((item) => (
                  <div key={item} className="flex items-center gap-3"><CheckCircle className="h-4 w-4 text-[#10B981]" />{item}</div>
                ))}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-[#050505] p-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <div className="mb-6 flex items-center justify-between">
                  <p className="text-sm font-medium">{t('landing.engine.title')}</p>
                  <RefreshCw className="h-4 w-4 text-[#10B981]" />
                </div>
                <div className="space-y-4">
                  {[
                    [t('landing.engine.row1.label'), t('landing.engine.row1.weight'), t('landing.engine.row1.value')],
                    [t('landing.engine.row2.label'), t('landing.engine.row2.weight'), t('landing.engine.row2.value')],
                    [t('landing.engine.row3.label'), t('landing.engine.row3.weight'), t('landing.engine.row3.value')],
                  ].map(([label, weight, value]) => (
                    <div key={label as string}>
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="text-white/62">{label as string}</span>
                        <span className="text-white/38">{weight as string}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#10B981]" style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="relative z-10 mx-auto max-w-7xl px-5 py-28 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="rounded-full border-white/10 bg-white/[0.05] text-white/70">{t('landing.pricing.badge')}</Badge>
          <h2 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">{t('landing.pricing.title')}</h2>
        </div>
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <div key={plan.nameKey} className={`premium-card premium-card-hover relative rounded-[1.75rem] p-7 ${plan.highlight ? 'border-[#2563EB]/55 shadow-blue-500/10' : ''}`}>
              {plan.highlight && <Badge className="mb-5 bg-[#2563EB] text-white">{t('landing.pricing.popular')}</Badge>}
              <h3 className="text-2xl font-semibold">{t(plan.nameKey)}</h3>
              <p className="mt-3 min-h-12 text-sm leading-6 text-white/52">{t(plan.descriptionKey)}</p>
              <div className="mt-7 flex items-end gap-1">
                <span className="text-5xl font-semibold tracking-tight">{plan.price}</span>
                <span className="pb-2 text-white/42">{t('landing.pricing.perMonth')}</span>
              </div>
              <div className="mt-7 space-y-3">
                {([0,1,2,3,4] as const).map((i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-white/64">
                    <CheckCircle className="h-4 w-4 text-[#10B981]" />{t(`${plan.featuresKey}.${i}`)}
                  </div>
                ))}
              </div>
              <Button onClick={() => openAuth('register')} className={`mt-8 w-full rounded-full ${plan.highlight ? 'bg-white text-black hover:bg-white/90' : 'border border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.09]'}`}>
                {t(plan.ctaKey)}
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 px-5 pb-24 lg:px-8">
        <div className="shine-line mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-white/[0.045] p-10 text-center md:p-16">
          <Building2 className="mx-auto mb-6 h-8 w-8 text-[#2563EB]" />
          <h2 className="text-balance text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">{t('landing.finalCta.title')}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/52">{t('landing.finalCta.subtitle')}</p>
          <Button onClick={() => openAuth('register')} size="lg" className="mt-9 rounded-full bg-white px-8 text-black hover:bg-white/90">{t('landing.cta.start')}</Button>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-5 py-10 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-white/42 md:flex-row md:items-center md:justify-between">
          <span>EuroComply AI</span>
          <span>{t('landing.footer.tagline')}</span>
          <span>{t('landing.footer.badges')}</span>
        </div>
      </footer>

      {showAuthModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xl">
          <div className="premium-shell relative w-full max-w-md rounded-[1.75rem]">
            <button className="absolute right-5 top-5 text-white/42 hover:text-white" onClick={() => setShowAuthModal(false)}><X className="h-5 w-5" /></button>
            {onboardingStep === 'auth' ? (
              <div className="p-7">
                <div className="mb-6">
                  <p className="text-xs uppercase tracking-[0.28em] text-white/36">{t('auth.secure')}</p>
                  <h2 className="mt-2 text-2xl font-semibold">{authMode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}</h2>
                  <p className="mt-2 text-sm text-white/50">{t('auth.subtitle')}</p>
                </div>
                <Button variant="outline" className="mb-4 w-full border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white" onClick={handleGoogleAuth} disabled={authLoading || authLoadingState}>{t('auth.continueWithGoogle')}</Button>
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  {authMode === 'register' && (
                    <>
                      <Input className="border-white/10 bg-white/[0.05] text-white placeholder:text-white/35" placeholder={t('auth.fullName')} value={name} onChange={(e) => setName(e.target.value)} required />
                      <Input className="border-white/10 bg-white/[0.05] text-white placeholder:text-white/35" placeholder={t('auth.companyName')} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                    </>
                  )}
                  <Input className="border-white/10 bg-white/[0.05] text-white placeholder:text-white/35" type="email" placeholder={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <div className="relative">
                    <Input className="border-white/10 bg-white/[0.05] pr-10 text-white placeholder:text-white/35" type={showPassword ? 'text' : 'password'} placeholder={t('auth.password')} value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/42" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {authError && <p className="text-sm text-red-300">{authError}</p>}
                  <Button type="submit" className="w-full bg-white text-black hover:bg-white/90" disabled={authLoading || authLoadingState}>
                    {authLoadingState ? (authMode === 'login' ? t('auth.loggingIn') : t('auth.creating')) : (authMode === 'login' ? t('auth.loginBtn') : t('auth.registerBtn'))}
                  </Button>
                </form>
                <button className="mt-5 w-full text-center text-sm text-white/52 hover:text-white" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
                  {authMode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleOnboardingSubmit} className="space-y-4 p-7">
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-[0.28em] text-white/36">{t('onboarding.badge')}</p>
                  <h2 className="mt-2 text-2xl font-semibold">{t('onboarding.title')}</h2>
                </div>
                <Input className="border-white/10 bg-white/[0.05] text-white" placeholder={t('onboarding.fullName')} value={profileData.fullName} onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })} required />
                <Input className="border-white/10 bg-white/[0.05] text-white" placeholder={t('onboarding.companyName')} value={profileData.companyName} onChange={(e) => setProfileData({ ...profileData, companyName: e.target.value })} required />
                <select className="h-10 w-full rounded-md border border-white/10 bg-[#0B0F19] px-3 text-sm text-white" value={profileData.companySize} onChange={(e) => setProfileData({ ...profileData, companySize: e.target.value })} required>
                  <option value="">{t('onboarding.companySize.label')}</option>
                  {companySizes.map((s) => <option key={s.value} value={s.value}>{t(s.labelKey)}</option>)}
                </select>
                <select className="h-10 w-full rounded-md border border-white/10 bg-[#0B0F19] px-3 text-sm text-white" value={profileData.industry} onChange={(e) => setProfileData({ ...profileData, industry: e.target.value })} required>
                  <option value="">{t('onboarding.industry.label')}</option>
                  {industries.map((ind) => <option key={ind.value} value={ind.value}>{t(ind.labelKey)}</option>)}
                </select>
                <Button type="submit" className="w-full bg-white text-black hover:bg-white/90" disabled={onboardingLoading}>
                  {onboardingLoading ? t('onboarding.loading') : t('onboarding.cta')}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
