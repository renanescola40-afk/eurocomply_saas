import type { Metadata } from 'next';

import DashboardChildI18nRuntime from '@/components/DashboardChildI18nRuntime';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardChildI18nRuntime />
      {children}
    </>
  );
}
