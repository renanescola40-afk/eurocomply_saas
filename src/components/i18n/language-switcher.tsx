'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe2 } from 'lucide-react';
import { LOCALE_META, locales, type Locale } from '@/lib/i18n/routing';

function switchLocalePath(pathname: string, nextLocale: Locale) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length > 0 && locales.includes(parts[0] as Locale)) {
    parts[0] = nextLocale;
    return `/${parts.join('/')}`;
  }
  return `/${nextLocale}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

function persistLocale(locale: Locale) {
  try {
    localStorage.setItem('eurocomply-locale', locale);
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;samesite=lax`;
  } catch {}
}

function persistLocaleScript(locale: Locale) {
  return `try{localStorage.setItem('eurocomply-locale','${locale}');document.cookie='NEXT_LOCALE=${locale};path=/;max-age=31536000;samesite=lax'}catch(e){}`;
}

type LanguageSwitcherProps = {
  currentLocale: Locale;
  variant?: 'dark' | 'light';
  compact?: boolean;
};

export function LanguageSwitcher({ currentLocale, variant = 'light', compact = false }: LanguageSwitcherProps) {
  const pathname = usePathname() || `/${currentLocale}`;
  const isDark = variant === 'dark';

  return (
    <div className={`flex items-center gap-1 rounded-full border p-1 ${isDark ? 'border-white/15 bg-black/30 text-white backdrop-blur' : 'border-border bg-background/80 text-foreground shadow-sm backdrop-blur'}`} aria-label="Selecionar idioma">
      {!compact ? <Globe2 className={`ml-2 h-4 w-4 ${isDark ? 'text-white/60' : 'text-muted-foreground'}`} /> : null}
      {locales.map((locale) => {
        const active = locale === currentLocale;
        const targetPath = switchLocalePath(pathname, locale);
        return (
          <Link
            key={locale}
            href={targetPath}
            onClick={(event) => {
              persistLocale(locale);
              if (locale !== currentLocale) {
                event.preventDefault();
                window.location.assign(targetPath);
              }
            }}
            className={`rounded-full px-2.5 py-1.5 text-xs font-bold uppercase tracking-[0.18em] transition ${active ? (isDark ? 'bg-white text-black' : 'bg-foreground text-background') : isDark ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            title={LOCALE_META[locale].nativeName}
            prefetch={false}
          >
            {locale}
          </Link>
        );
      })}
      <script dangerouslySetInnerHTML={{ __html: persistLocaleScript(currentLocale) }} />
    </div>
  );
}
