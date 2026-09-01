import { PublicCommercialRouteV2 } from '@/components/marketing/public-commercial-route-v2';

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <PublicCommercialRouteV2 surface="pricing">{children}</PublicCommercialRouteV2>;
}
