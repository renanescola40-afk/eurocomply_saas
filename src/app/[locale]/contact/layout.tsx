import { PublicCommercialRouteV2 } from '@/components/marketing/public-commercial-route-v2';

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <PublicCommercialRouteV2 surface="contact">{children}</PublicCommercialRouteV2>;
}
