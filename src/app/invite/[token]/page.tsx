import { redirect } from 'next/navigation';

interface InviteRedirectPageProps {
  params: {
    token: string;
  };
}

export default function InviteRedirectPage({ params }: InviteRedirectPageProps) {
  redirect(`/en/invite/${params.token}`);
}
