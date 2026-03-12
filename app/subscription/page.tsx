import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { isSubscriber } from '@/lib/subscription/is-subscriber';
import Link from 'next/link';
import SubscriptionStatusSection from '@/app/settings/SubscriptionStatusSection';

interface SubscriptionPageProps {
  searchParams:
    | Promise<{ subscription?: string }>
    | { subscription?: string };
}

export default async function SubscriptionPage({ searchParams }: SubscriptionPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const params = (searchParams instanceof Promise ? await searchParams : searchParams) ?? {};

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex align-items-center gap-3">
            <Link href="/dashboard" className="btn btn-outline-secondary btn-sm">
              <i className="bx bx-arrow-back me-1"></i>
              Back to Dashboard
            </Link>
            <h1 className="h3 mb-0">Subscription</h1>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12 col-lg-6">
          <SubscriptionStatusSection
            customerStatus={user.customerStatus ?? 'free'}
            isSubscriber={isSubscriber(user.customerStatus)}
            subscriptionFeedback={params.subscription}
            priceMonthly={process.env.STRIPE_PRICE_MONTHLY}
            priceAnnual={process.env.STRIPE_PRICE_ANNUAL}
            priceMonthlyLabel={process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY_LABEL ?? '$6.99/mo'}
            priceAnnualLabel={process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL_LABEL ?? '$60/yr'}
          />
        </div>
      </div>
    </div>
  );
}
