'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/lib/i18n/navigation';
import { useState, useRef, useEffect, useTransition } from 'react';
import { locales, LOCALE_META, type Locale } from '@/lib/i18n/routing';

const COOKIE_NAME = 'NEXT_LOCALE';

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'inline';
  className?: string;
}

export default function LanguageSwitcher({ variant = 'dropdown', className = '' }: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentMeta = LOCALE_META[locale] ?? LOCALE_META.en;

  // Fechar ao clicar fora
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
    // Guardar cookie por 1 ano
    document.cookie = `${COOKIE_NAME}=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    
    // Usar o router do next-intl para navegação com locale
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
    
    setOpen(false);
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
              onClick={() => switchLocale(loc)}
              disabled={isPending}
              title={meta.nativeName}
              className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              } ${isPending ? 'opacity-50 cursor-wait' : ''}`}
            >
              {loc.toUpperCase()}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        disabled={isPending}
        className={`flex items-center gap-2 px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors text-sm ${isPending ? 'opacity-50 cursor-wait' : ''}`}
        aria-label="Select language"
      >
        <span className="text-base">{currentMeta.flag}</span>
        <span>{currentMeta.nativeName}</span>
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-48 rounded-lg bg-[#0a0a0a] border border-white/10 shadow-xl z-50 overflow-hidden">
          {locales.map((loc) => {
            const meta = LOCALE_META[loc];
            const isActive = loc === locale;
            return (
              <button
                key={loc}
                onClick={() => switchLocale(loc)}
                disabled={isPending}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                } ${isPending ? 'opacity-50 cursor-wait' : ''}`}
              >
                <span className="text-lg">{meta.flag}</span>
                <span className="flex-1 text-left">{meta.nativeName}</span>
                {isActive && (
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
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
