import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/integrations/supabase/server';

const PLANS = ['starter', 'growth', 'enterprise'] as const;
type Plan = typeof PLANS[number];

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
  });
};

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const isValidPlan = (plan?: string): plan is Plan => Boolean(plan && PLANS.includes(plan as Plan));

const getVerifiedWorkspace = async (userId?: string, workspaceId?: string) => {
  if (!userId || !workspaceId) return null;

  const { data: member, error: memberError } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id, user_id, status')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (memberError || !member) return null;

  const { data: workspace, error: workspaceError } = await supabaseAdmin
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle();

  if (workspaceError || !workspace) return null;
  return workspace;
};

const syncWorkspacePlan = async (workspaceId: string, plan: string) => {
  await supabaseAdmin
    .from('workspaces')
    .update({ plan, updated_at: new Date().toISOString() })
    .eq('id', workspaceId);
};

export async function POST(request: NextRequest) {
  const stripe = getStripe();

  if (!stripe) {
    return NextResponse.json({ received: true, message: 'Stripe não configurado' });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature || !endpointSecret) {
    return NextResponse.json({ error: 'Assinatura ausente' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err) {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, workspaceId, plan } = session.metadata || {};

        if (!isValidPlan(plan)) {
          return NextResponse.json({ error: 'Plano inválido no webhook' }, { status: 400 });
        }

        const workspace = await getVerifiedWorkspace(userId, workspaceId);
        if (!workspace || session.mode !== 'subscription' || !session.subscription) {
          return NextResponse.json({ error: 'Assinatura não autorizada' }, { status: 400 });
        }

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

        await supabaseAdmin
          .from('subscriptions')
          .upsert({
            user_id: userId,
            workspace_id: workspaceId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: session.customer as string,
            plan,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          });

        await supabaseAdmin
          .from('payments')
          .insert({
            user_id: userId,
            workspace_id: workspaceId,
            stripe_invoice_id: typeof subscription.latest_invoice === 'string' ? subscription.latest_invoice : null,
            amount: subscription.items.data[0]?.price?.unit_amount || 0,
            currency: subscription.items.data[0]?.price?.currency || 'eur',
            status: 'succeeded',
            payment_method: 'card',
            metadata: { stripe_subscription_id: subscription.id },
          });

        await syncWorkspacePlan(workspaceId, plan);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const { data: current } = await supabaseAdmin
          .from('subscriptions')
          .select('workspace_id, plan')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle();

        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (current?.workspace_id && current?.plan && subscription.status === 'active') {
          await syncWorkspacePlan(current.workspace_id, current.plan);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const { data: current } = await supabaseAdmin
          .from('subscriptions')
          .select('workspace_id')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle();

        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subscription.id);

        if (current?.workspace_id) {
          await syncWorkspacePlan(current.workspace_id, 'starter');
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;

        const { data: subscription } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id, workspace_id')
          .eq('stripe_subscription_id', invoice.subscription as string)
          .maybeSingle();

        if (!subscription?.user_id || !subscription?.workspace_id) break;

        await supabaseAdmin
          .from('payments')
          .insert({
            user_id: subscription.user_id,
            workspace_id: subscription.workspace_id,
            stripe_invoice_id: invoice.id,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: 'succeeded',
            payment_method: 'card',
            metadata: { stripe_subscription_id: invoice.subscription },
          });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;

        if (invoice.subscription) {
          await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', invoice.subscription as string);
        }
        break;
      }
    }
  } catch (error) {
    console.error('Stripe webhook processing error');
    return NextResponse.json({ error: 'Falha ao processar webhook' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
