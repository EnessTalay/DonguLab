import { useState } from 'react';
import { istanbulDate as getTodayInIstanbul } from '@/lib/dates';
import { useBusinessResources } from './use-business-resources';
import { useListingForm } from './use-listing-form';
import { useBusinessRequests } from './use-business-requests';

export function useBusiness() {
  const [section, setSection] = useState<'listings' | 'new' | 'requests'>(
    'listings',
  );
  const [listingFilter, setListingFilter] = useState<
    'all' | 'available' | 'expired'
  >('all');
  const [requestFilter, setRequestFilter] = useState<
    'active' | 'history' | 'all'
  >('active');
  const resources = useBusinessResources();
  const form = useListingForm(resources);
  const requests = useBusinessRequests(resources);
  const visibleListings = resources.listings.filter(
    (listing) =>
      listingFilter === 'all' ||
      (listingFilter === 'expired'
        ? listing.pickupDeadline < getTodayInIstanbul()
        : listing.pickupDeadline >= getTodayInIstanbul() &&
          listing.quantityOnHand > listing.quantityReserved),
  );
  const visibleRequests = resources.incomingRequests.filter(
    (item) =>
      requestFilter === 'all' ||
      (item.request.status === 'pending' ||
        item.request.status === 'approved') ===
        (requestFilter === 'active'),
  );
  return {
    section,
    setSection,
    listingFilter,
    setListingFilter,
    requestFilter,
    setRequestFilter,
    visibleListings,
    visibleRequests,
    ...resources,
    ...form,
    ...requests,
  };
}

export type BusinessModel = ReturnType<typeof useBusiness>;
