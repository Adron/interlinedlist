import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function getCustomerStatusFromSubscription(subscription: Stripe.Subscription): string {
  const isPaidOrGrace = ['active', 'trialing', 'past_due'].includes(subscription.status);
  if (!isPaidOrGrace) return 'free';
  const item = subscription.items.data[0];
  if (!item?.price?.id) return 'subscriber';
  const priceMonthly = process.env.STRIPE_PRICE_MONTHLY;
  const priceAnnual = process.env.STRIPE_PRICE_ANNUAL;
  if (item.price.id === priceAnnual) return 'subscriber:annual';
  if (item.price.id === priceMonthly) return 'subscriber:monthly';
  return 'subscriber';
}

export interface SubscriptionSyncResult {
  customerStatus: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number | null;
}

/**
 * Sync user's customerStatus from Stripe and return subscription details for display.
 * Use when webhooks may not have fired (e.g. local dev without Stripe CLI, or immediate post-checkout).
 */
export async function syncSubscriptionFromStripe(
  stripeCustomerId: string
): Promise<SubscriptionSyncResult | null> {
  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: 'all',
    limit: 5,
  });
  const activeSub = subscriptions.data.find((s) =>
    ['active', 'trialing', 'past_due'].includes(s.status)
  );
  const customerStatus = activeSub
    ? getCustomerStatusFromSubscription(activeSub)
    : 'free';

  const result = await prisma.user.updateMany({
    where: { stripeCustomerId },
    data: { customerStatus },
  });

  if (result.count === 0) return null;

  const periodEnd =
    (activeSub as { current_period_end?: number })?.current_period_end ??
    activeSub?.items?.data?.[0]?.current_period_end ??
    null;
  return {
    customerStatus,
    cancelAtPeriodEnd: activeSub?.cancel_at_period_end ?? false,
    currentPeriodEnd: periodEnd,
  };
}
