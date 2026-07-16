import { PostHogScript } from "@/components/analytics/posthog-script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const localeLanguageBootstrap = `(() => {
  const supportedLocales = new Set(['en', 'pt', 'es', 'fr', 'it', 'de']);
  const locale = window.location.pathname.split('/').filter(Boolean)[0];
  if (supportedLocales.has(locale)) document.documentElement.lang = locale;
})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: localeLanguageBootstrap }} />
        {children}
        <PostHogScript />
      </body>
    </html>
  );
}
