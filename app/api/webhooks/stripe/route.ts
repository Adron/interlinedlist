import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

function getCustomerStatusFromSubscription(subscription: Stripe.Subscription): string {
  // Treat active, trialing, and past_due as subscriber (grace period for failed payments)
  const isPaidOrGrace = ['active', 'trialing', 'past_due'].includes(subscription.status);
  if (!isPaidOrGrace) {
    return 'free';
  }
  const item = subscription.items.data[0];
  if (!item?.price?.id) return 'subscriber';

  const priceMonthly = process.env.STRIPE_PRICE_MONTHLY;
  const priceAnnual = process.env.STRIPE_PRICE_ANNUAL;

  if (item.price.id === priceAnnual) return 'subscriber:annual';
  if (item.price.id === priceMonthly) return 'subscriber:monthly';
  return 'subscriber';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Stripe webhook signature verification failed:', message);
      return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const subscriptionId =
            typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const customerId = subscription.customer as string;
          const customerStatus = getCustomerStatusFromSubscription(subscription);
          let result = await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: { customerStatus },
          });
          if (result.count === 0) {
            const customer = await stripe.customers.retrieve(customerId);
            const email = (customer as Stripe.Customer).email;
            if (email) {
              result = await prisma.user.updateMany({
                where: { email },
                data: { stripeCustomerId: customerId, customerStatus },
              });
            }
          }
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const customerStatus = getCustomerStatusFromSubscription(subscription);

        let result = await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { customerStatus },
        });
        if (result.count === 0) {
          const customer = await stripe.customers.retrieve(customerId);
          const email = (customer as Stripe.Customer).email;
          if (email) {
            result = await prisma.user.updateMany({
              where: { email },
              data: { stripeCustomerId: customerId, customerStatus },
            });
          }
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        let result = await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { customerStatus: 'free' },
        });
        if (result.count === 0) {
          const customer = await stripe.customers.retrieve(customerId);
          const email = (customer as Stripe.Customer).email;
          if (email) {
            result = await prisma.user.updateMany({
              where: { email },
              data: { stripeCustomerId: customerId, customerStatus: 'free' },
            });
          }
        }
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
