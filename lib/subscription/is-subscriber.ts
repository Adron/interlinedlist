/**
 * Determine if a user has an active subscription based on customerStatus.
 */
export function isSubscriber(customerStatus: string | null | undefined): boolean {
  if (!customerStatus) return false;
  return customerStatus === 'subscriber' || customerStatus.startsWith('subscriber:');
}
