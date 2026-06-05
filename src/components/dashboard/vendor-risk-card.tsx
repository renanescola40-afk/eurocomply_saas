import { Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export type VendorRiskCardProps = {
  totalVendors: number;
  highRiskVendors: number;
};

export function VendorRiskCard({ totalVendors, highRiskVendors }: VendorRiskCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" /> Vendor Risk
        </CardTitle>
        <CardDescription>Third-party compliance and data access exposure.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-3xl font-semibold">{totalVendors}</p>
          <p className="text-sm text-muted-foreground">Tracked vendors</p>
        </div>
        <div>
          <p className="text-3xl font-semibold">{highRiskVendors}</p>
          <p className="text-sm text-muted-foreground">High-risk vendors</p>
        </div>
      </CardContent>
    </Card>
  );
}
