import type { Listing } from '@/types/domain';

export type ListingAvailability =
  | 'closed'
  | 'expired'
  | 'sold-out'
  | 'missing-thickness'
  | 'available';

export function getAvailableStock(listing: Pick<
  Listing,
  'quantityOnHand' | 'quantityReserved'
>): number {
  return listing.quantityOnHand - listing.quantityReserved;
}

export function getListingAvailability(
  listing: Listing,
  today: string,
): ListingAvailability {
  if (listing.status === 'closed') return 'closed';
  if (listing.pickupDeadline < today) return 'expired';
  if (getAvailableStock(listing) <= 0) return 'sold-out';
  if (listing.thicknessMm === null) return 'missing-thickness';
  return 'available';
}
