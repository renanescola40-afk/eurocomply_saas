export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const title = locale === 'pt' ? 'Tarefas' : 'Tasks';

  return <h1>{title}</h1>;
}
