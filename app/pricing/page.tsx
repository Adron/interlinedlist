import { getCurrentUser } from '@/lib/auth/session';
import { isSubscriber } from '@/lib/subscription/is-subscriber';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — InterlinedList',
  description: 'Simple, transparent pricing. Start free, upgrade when you need more.',
};

const FREE_FEATURES = [
  'Post messages and updates',
  'Follow other users',
  'Public profile',
  'Dashboard and feed',
  'Basic notifications',
  'Light and dark theme',
];

const PAID_FEATURES = [
  'Everything in Free',
  'Create and manage Lists',
  'Documents and folders',
  'Organizations and workspaces',
  'Longer posts',
  'Priority support',
];

export default async function PricingPage() {
  const user = await getCurrentUser();
  const userIsSubscriber = user ? isSubscriber(user.customerStatus) : false;

  const monthlyLabel = process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY_LABEL ?? '$6.99/mo';
  const annualLabel = process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL_LABEL ?? '$60/yr';

  return (
    <div className="container-fluid container-fluid-max py-5">
      <div className="row mb-5 text-center">
        <div className="col-12">
          <h1 className="h2 mb-2">Simple, transparent pricing</h1>
          <p className="text-muted mb-0">
            Start free. Upgrade when you need lists, documents, and organizations.
          </p>
        </div>
      </div>

      <div className="row justify-content-center g-4 mb-5">
        {/* Free tier */}
        <div className="col-12 col-md-5 col-lg-4">
          <div className="card h-100">
            <div className="card-body d-flex flex-column p-4">
              <div className="mb-4">
                <span className="badge bg-secondary mb-2">Free</span>
                <div className="display-6 fw-bold mb-1">$0</div>
                <p className="text-muted small mb-0">No credit card required</p>
              </div>

              <ul className="list-unstyled flex-grow-1 mb-4">
                {FREE_FEATURES.map((feature) => (
                  <li key={feature} className="d-flex align-items-center gap-2 mb-2">
                    <i className="bx bx-check text-success fs-5"></i>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                {user ? (
                  <span className="btn btn-outline-secondary w-100 disabled">
                    {userIsSubscriber ? 'Free plan' : 'Your current plan'}
                  </span>
                ) : (
                  <Link href="/register" className="btn btn-outline-primary w-100">
                    Get started free
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Paid tier */}
        <div className="col-12 col-md-5 col-lg-4">
          <div className="card h-100 border-primary">
            <div className="card-body d-flex flex-column p-4">
              <div className="mb-4">
                <span className="badge bg-primary mb-2">Subscriber</span>
                <div className="mb-1">
                  <span className="display-6 fw-bold">{monthlyLabel}</span>
                </div>
                <p className="text-muted small mb-0">
                  or {annualLabel} billed annually&nbsp;
                  <span className="badge bg-success">Save ~30%</span>
                </p>
              </div>

              <ul className="list-unstyled flex-grow-1 mb-4">
                {PAID_FEATURES.map((feature) => (
                  <li key={feature} className="d-flex align-items-center gap-2 mb-2">
                    <i className="bx bx-check text-success fs-5"></i>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                {userIsSubscriber ? (
                  <Link href="/subscription" className="btn btn-outline-primary w-100">
                    <i className="bx bx-cog me-1"></i>
                    Manage subscription
                  </Link>
                ) : user ? (
                  <Link href="/subscription" className="btn btn-primary w-100">
                    Upgrade now
                  </Link>
                ) : (
                  <Link href="/register" className="btn btn-primary w-100">
                    Start free, then upgrade
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ-style clarifications */}
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8">
          <h2 className="h5 mb-3 text-center">Questions</h2>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <div className="card">
                <div className="card-body">
                  <h3 className="h6 mb-1">Can I try before subscribing?</h3>
                  <p className="text-muted small mb-0">
                    Yes. The free plan has no time limit. Sign up, post messages, follow others, and upgrade only when you need lists, documents, or organizations.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div className="card">
                <div className="card-body">
                  <h3 className="h6 mb-1">Can I cancel at any time?</h3>
                  <p className="text-muted small mb-0">
                    Yes. Cancel any time from your subscription page and you keep access until the end of the billing period.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div className="card">
                <div className="card-body">
                  <h3 className="h6 mb-1">What happens to my data if I cancel?</h3>
                  <p className="text-muted small mb-0">
                    Your posts and profile stay intact. Subscriber-only content like lists and documents remains readable; creating new ones requires an active subscription.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div className="card">
                <div className="card-body">
                  <h3 className="h6 mb-1">Is annual billing a better deal?</h3>
                  <p className="text-muted small mb-0">
                    At {annualLabel} per year versus {monthlyLabel} per month, the annual plan saves around 30% compared to paying month-to-month.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {!user && (
            <div className="text-center mt-4">
              <Link href="/register" className="btn btn-primary me-2">
                Create a free account
              </Link>
              <Link href="/login" className="btn btn-outline-secondary">
                Sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
