import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/integrations/supabase/server';

const PRICE_IDS = {
  starter: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter_placeholder',
  growth: process.env.STRIPE_GROWTH_PRICE_ID || 'price_growth_placeholder',
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_placeholder',
};

const PLANS = ['starter', 'growth', 'enterprise'] as const;
type Plan = typeof PLANS[number];

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
  });
};

const getAppUrl = () => process.env.NEXT_PUBLIC_APP_URL || requestOriginFallback();

const requestOriginFallback = () => {
  const appUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
  return appUrl || 'https://app.eurocomply.ai';
};

const authenticateRequest = async (request: NextRequest) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { error: 'Não autenticado', status: 401 as const };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { error: 'Sessão inválida', status: 401 as const };

  return { user: data.user };
};

const getWorkspaceForUser = async (userId: string, workspaceId?: string) => {
  let query = supabaseAdmin
    .from('workspace_members')
    .select('workspace_id, role, status')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data: member, error: memberError } = await query.maybeSingle();
  if (memberError || !member?.workspace_id) return null;

  const { data: workspace, error: workspaceError } = await supabaseAdmin
    .from('workspaces')
    .select('id, name, plan')
    .eq('id', member.workspace_id)
    .maybeSingle();

  if (workspaceError || !workspace) return null;

  return workspace;
};

const createCheckoutSession = async (request: NextRequest, plan: Plan, workspaceId?: string) => {
  const auth = await authenticateRequest(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const workspace = await getWorkspaceForUser(auth.user.id, workspaceId);
  if (!workspace) {
    return NextResponse.json({ error: 'Workspace não encontrado ou sem permissão' }, { status: 403 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe não configurado' }, { status: 503 });
  }

  const priceId = PRICE_IDS[plan];
  if (priceId.includes('placeholder')) {
    return NextResponse.json({ error: 'Preço Stripe não configurado', plan }, { status: 503 });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('email, full_name')
    .eq('id', auth.user.id)
    .maybeSingle();

  const appUrl = getAppUrl();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: profile?.email || auth.user.email || undefined,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}&success=true`,
    cancel_url: `${appUrl}/dashboard?canceled=true`,
    metadata: {
      userId: auth.user.id,
      workspaceId: workspace.id,
      plan,
    },
    subscription_data: {
      metadata: {
        userId: auth.user.id,
        workspaceId: workspace.id,
        plan,
      },
    },
  });

  return NextResponse.json({ url: session.url, sessionId: session.id });
};

export async function GET(request: NextRequest) {
  const plan = request.nextUrl.searchParams.get('plan') || 'starter';
  const workspaceId = request.nextUrl.searchParams.get('workspaceId') || undefined;

  if (!PLANS.includes(plan as Plan)) {
    return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
  }

  try {
    return await createCheckoutSession(request, plan as Plan, workspaceId);
  } catch (error) {
    console.error('Stripe checkout error');
    return NextResponse.json({ error: 'Falha ao criar checkout' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const plan = body?.plan || 'starter';
    const workspaceId = body?.workspaceId;

    if (!PLANS.includes(plan as Plan)) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }

    return await createCheckoutSession(request, plan as Plan, workspaceId);
  } catch (error) {
    console.error('Stripe checkout error');
    return NextResponse.json({ error: 'Falha ao criar checkout' }, { status: 500 });
  }
}
