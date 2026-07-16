import { PostHogScript } from "@/components/analytics/posthog-script";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/routing";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const NEXT_INTL_LOCALE_HEADER = "x-next-intl-locale";
const RISCK_LOCALE_HEADER = "x-risck-locale";

function resolveDocumentLocale(value: string | null): Locale {
  return value && locales.includes(value as Locale) ? (value as Locale) : defaultLocale;
}

async function getDocumentLocale(): Promise<Locale> {
  const requestHeaders = await headers();
  const requestLocale =
    requestHeaders.get(RISCK_LOCALE_HEADER) ??
    requestHeaders.get(NEXT_INTL_LOCALE_HEADER);

  return resolveDocumentLocale(requestLocale);
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getDocumentLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        {children}
        <PostHogScript />
      </body>
    </html>
  );
}
