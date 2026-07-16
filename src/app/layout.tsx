import { PostHogScript } from "@/components/analytics/posthog-script";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/routing";
import { Geist, Geist_Mono } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";

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
  const locale = resolveDocumentLocale(await getLocale());

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        {children}
        <PostHogScript />
      </body>
    </html>
  );
}
