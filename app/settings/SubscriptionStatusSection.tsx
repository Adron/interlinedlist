import SubscriptionActions from '@/components/settings/SubscriptionActions';

function formatCustomerStatus(status: string): string {
  switch (status) {
    case 'free':
      return 'Free';
    case 'subscriber':
      return 'Subscriber';
    case 'subscriber:monthly':
      return 'Subscriber (Monthly)';
    case 'subscriber:annual':
      return 'Subscriber (Annual)';
    default:
      return status || 'Free';
  }
}

interface SubscriptionStatusSectionProps {
  customerStatus: string;
  isSubscriber: boolean;
}

export default function SubscriptionStatusSection({ customerStatus, isSubscriber }: SubscriptionStatusSectionProps) {
  const displayStatus = formatCustomerStatus(customerStatus || 'free');

  return (
    <div className="card">
      <div className="card-body">
        <h3 className="h5 mb-3">Subscription</h3>
        <div className="mb-3">
          <label className="form-label text-muted small mb-1">Customer status</label>
          <p className="form-control-plaintext mb-0 fw-medium">{displayStatus}</p>
          <small className="form-text text-muted">
            Status changes when you subscribe or cancel. Managed via billing.
          </small>
        </div>
        <SubscriptionActions
          isSubscriber={isSubscriber}
          priceMonthly={process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY}
          priceAnnual={process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL}
        />
      </div>
    </div>
  );
}
