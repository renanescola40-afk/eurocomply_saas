// Root layout — minimal wrapper. All fonts, providers, and html/body
// are in src/app/[locale]/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
