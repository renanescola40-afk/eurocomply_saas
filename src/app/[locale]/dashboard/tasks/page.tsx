export default function Page({ params }: { params: { locale: string } }) {
  const title = params.locale === 'pt' ? 'Tarefas' : 'Tasks';

  return <h1>{title}</h1>;
}
