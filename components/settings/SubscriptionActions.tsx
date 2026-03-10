'use client';

import { useState } from 'react';

interface SubscriptionActionsProps {
  isSubscriber: boolean;
  priceMonthly?: string;
  priceAnnual?: string;
}

export default function SubscriptionActions({
  isSubscriber,
  priceMonthly,
  priceAnnual,
}: SubscriptionActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string) => {
    setLoading(priceId);
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setLoading(null);
        alert(data.error || 'Failed to start checkout');
      }
    } catch (err) {
      setLoading(null);
      alert('Failed to start checkout');
    }
  };

  const handleManage = async () => {
    setLoading('manage');
    try {
      const res = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setLoading(null);
        alert(data.error || 'Failed to open billing portal');
      }
    } catch (err) {
      setLoading(null);
      alert('Failed to open billing portal');
    }
  };

  if (isSubscriber) {
    return (
      <button
        type="button"
        className="btn btn-outline-primary btn-sm"
        onClick={handleManage}
        disabled={loading !== null}
      >
        {loading === 'manage' ? (
          <>
            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            Opening...
          </>
        ) : (
          <>
            <i className="bx bx-cog me-1"></i>
            Manage subscription
          </>
        )}
      </button>
    );
  }

  if (!priceMonthly && !priceAnnual) {
    return (
      <small className="text-muted">
        Subscription plans coming soon. Contact support to upgrade.
      </small>
    );
  }

  return (
    <div className="d-flex flex-wrap gap-2">
      {priceMonthly && (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => handleSubscribe(priceMonthly)}
          disabled={loading !== null}
        >
          {loading === priceMonthly ? (
            <>
              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              Redirecting...
            </>
          ) : (
            <>
              <i className="bx bx-cart me-1"></i>
              Subscribe ($6.99/mo)
            </>
          )}
        </button>
      )}
      {priceAnnual && (
        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={() => handleSubscribe(priceAnnual)}
          disabled={loading !== null}
        >
          {loading === priceAnnual ? (
            <>
              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              Redirecting...
            </>
          ) : (
            'Annual ($60/yr)'
          )}
        </button>
      )}
    </div>
  );
}
