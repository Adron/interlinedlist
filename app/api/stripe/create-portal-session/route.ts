import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCurrentUser } from '@/lib/auth/session';
import { APP_URL } from '@/lib/config/app';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No subscription to manage' },
        { status: 400 }
      );
    }

    const returnUrl = `${APP_URL}/subscription`;
    let sessionParams: Stripe.BillingPortal.SessionCreateParams = {
      customer: user.stripeCustomerId,
      return_url: returnUrl,
    };

    const body = await request.json().catch(() => ({}));
    if (body.flow === 'cancel') {
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'all',
        limit: 10,
      });
      const activeSub = subscriptions.data.find((s) =>
        ['active', 'trialing', 'past_due'].includes(s.status)
      );
      if (activeSub) {
        sessionParams.flow_data = {
          type: 'subscription_cancel',
          subscription_cancel: {
            subscription: activeSub.id,
          },
          after_completion: {
            type: 'redirect',
            redirect: { return_url: returnUrl },
          },
        };
      }
    }

    const session = await stripe.billingPortal.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error('Create portal session error:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
