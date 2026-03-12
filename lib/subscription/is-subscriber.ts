/**
 * Returns true if the customer has an active subscription.
 * customerStatus values: 'free' | 'subscriber' | 'subscriber:monthly' | 'subscriber:annual'
 */
export function isSubscriber(customerStatus: string | null | undefined): boolean {
  if (!customerStatus) return false;
  return (
    customerStatus === 'subscriber' ||
    customerStatus.startsWith('subscriber:')
  );
}
