import { NextResponse } from 'next/server';

import type { PlanEntitlements } from '@/server/billing/entitlements';

export type UpgradeRequiredPayload = {
  error: string;
  message: string;
  plan: PlanEntitlements['plan'];
  requiredPlan?: string;
  entitlements?: PlanEntitlements;
};

export function upgradeRequiredResponse(payload: UpgradeRequiredPayload, status = 402) {
  return NextResponse.json(
    {
      error: payload.error,
      message: payload.message,
      plan: payload.plan,
      requiredPlan: payload.requiredPlan,
      entitlements: payload.entitlements,
      upgradeUrl: '/pricing',
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
