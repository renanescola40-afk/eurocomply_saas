import { PublicCommercialRouteV2 } from '@/components/marketing/public-commercial-route-v2';

export default function EnterpriseLayout({ children }: { children: React.ReactNode }) {
  return <PublicCommercialRouteV2 surface="enterprise">{children}</PublicCommercialRouteV2>;
}
