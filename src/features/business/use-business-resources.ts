import { useCallback } from 'react';
import { services } from '@/services';
import { useFocusedResource } from '@/hooks/use-focused-resource';
import { getErrorMessage, getRequestErrorMessage } from './errors';

export function useBusinessResources() {
  const listingResource = useFocusedResource(
    useCallback(async () => {
      try {
        return await services.listMyListings();
      } catch (error) {
        throw new Error(getErrorMessage(error));
      }
    }, []),
  );
  const requestResource = useFocusedResource(
    useCallback(async () => {
      try {
        return await services.listIncomingRequests();
      } catch (error) {
        throw new Error(getRequestErrorMessage(error));
      }
    }, []),
  );
  async function refreshRequestActionData() {
    const [requestsRefreshed, listingsRefreshed] = await Promise.all([
      requestResource.reload(),
      listingResource.reload(),
    ]);
    return { requestsRefreshed, listingsRefreshed };
  }
  return {
    listings: listingResource.data ?? [],
    loadingListings: listingResource.loading,
    listError: listingResource.error,
    incomingRequests: requestResource.data ?? [],
    loadingRequests: requestResource.loading,
    requestListError: requestResource.error,
    loadListings: listingResource.reload,
    refreshIncomingRequests: requestResource.reload,
    refreshRequestActionData,
  };
}

export type BusinessResources = ReturnType<typeof useBusinessResources>;
