import { PublicCommercialRouteV2 } from '@/components/marketing/public-commercial-route-v2';

export default function BookDemoLayout({ children }: { children: React.ReactNode }) {
  return <PublicCommercialRouteV2 surface="book-demo">{children}</PublicCommercialRouteV2>;
}
