import { PostHogScript } from "@/components/analytics/posthog-script";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/routing";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const LOCALE_REQUEST_HEADER = "x-risck-locale";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function resolveDocumentLocale(value: string | null): Locale {
  return value && locales.includes(value as Locale) ? (value as Locale) : defaultLocale;
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const locale = resolveDocumentLocale(requestHeaders.get(LOCALE_REQUEST_HEADER));

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <PostHogScript />
      </body>
    </html>
  );
}
