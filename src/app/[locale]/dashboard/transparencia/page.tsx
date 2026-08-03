import { Article50Workspace } from '@/components/ai-governance/article-50-workspace';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function TransparenciaPage({ params }: PageProps) {
  const { locale } = await params;
  return <Article50Workspace locale={locale} />;
}
