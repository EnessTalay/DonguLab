import type { BusinessRequestView } from '@/services/contracts';

export function requestsForListing(
  requests: readonly BusinessRequestView[],
  listingId: string,
): BusinessRequestView[] {
  return requests.filter((item) => item.request.listingId === listingId);
}
