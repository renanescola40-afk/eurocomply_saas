'use client';

import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { locales, LOCALE_META, type Locale } from '@/lib/i18n/routing';

const COOKIE_NAME = 'NEXT_LOCALE';
const LOCALE_STORAGE_KEY = 'risck-comply-locale';
const LEGACY_LOCALE_STORAGE_KEY = 'eurocomply-locale';

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'inline';
  className?: string;
}

function stripLocaleFromPath(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  if (locales.includes(firstSegment as Locale)) {
    const rest = segments.slice(1).join('/');
    return rest ? `/${rest}` : '/';
  }

  return pathname || '/';
}

function buildLocalizedPath(pathname: string, newLocale: Locale) {
  const pathWithoutLocale = stripLocaleFromPath(pathname);

  if (pathWithoutLocale === '/') {
    return `/${newLocale}`;
  }

  return `/${newLocale}${pathWithoutLocale}`;
}

function localeCode(locale: Locale) {
  return locale.toUpperCase();
}

export default function LanguageSwitcher({ variant = 'dropdown', className = '' }: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentMeta = LOCALE_META[locale] ?? LOCALE_META.en;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const switchLocale = (newLocale: Locale) => {
    const targetPath = buildLocalizedPath(pathname, newLocale);
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${COOKIE_NAME}=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax${secure}`;
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    localStorage.removeItem(LEGACY_LOCALE_STORAGE_KEY);
    setOpen(false);

    window.location.assign(targetPath);
  };

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {locales.map((loc) => {
          const meta = LOCALE_META[loc];
          const isActive = loc === locale;
          return (
            <button
              key={loc}
              type="button"
              onClick={() => switchLocale(loc)}
              title={meta.nativeName}
              aria-current={isActive ? 'true' : undefined}
              className={`h-8 rounded px-2 text-xs font-medium tracking-[0.18em] transition-colors ${
                isActive
                  ? 'bg-white text-black'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {localeCode(loc)}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        aria-label="Select language"
      >
        <span className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.18em] text-white">{localeCode(locale)}</span>
        <span>{currentMeta.nativeName}</span>
        <svg className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-48 overflow-hidden rounded-lg border border-white/10 bg-[#0a0a0a] shadow-xl">
          {locales.map((loc) => {
            const meta = LOCALE_META[loc];
            const isActive = loc === locale;
            return (
              <button
                key={loc}
                type="button"
                onClick={() => switchLocale(loc)}
                aria-current={isActive ? 'true' : undefined}
                className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="w-8 rounded border border-white/10 px-1.5 py-0.5 text-center text-[10px] font-semibold tracking-[0.18em]">{localeCode(loc)}</span>
                <span className="flex-1 text-left">{meta.nativeName}</span>
                {isActive && (
                  <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
