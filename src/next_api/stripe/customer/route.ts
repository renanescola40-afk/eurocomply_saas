import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/integrations/supabase/server';

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
  });
};

const authenticateRequest = async (request: NextRequest) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { error: 'Não autenticado', status: 401 as const };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { error: 'Sessão inválida', status: 401 as const };

  return { user: data.user };
};

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe não configurado' }, { status: 503 });
  }

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', auth.user.id)
      .maybeSingle();

    const email = profile?.email || auth.user.email;
    if (!email) {
      return NextResponse.json({ error: 'Perfil sem email' }, { status: 404 });
    }

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (subscription?.stripe_customer_id) {
      return NextResponse.json({ customerId: subscription.stripe_customer_id });
    }

    const customer = await stripe.customers.create({
      metadata: {
        userId: auth.user.id,
      },
      email,
      name: profile?.full_name || '',
    });

    return NextResponse.json({ customerId: customer.id });
  } catch (error) {
    console.error('Stripe customer error');
    return NextResponse.json({ error: 'Falha ao obter cliente Stripe' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
