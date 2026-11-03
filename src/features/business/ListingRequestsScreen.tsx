import { ActionButton, Feedback } from '@/components/ui';
import { Screen } from '@/components/screen';
import { useLocalSearchParams, router } from 'expo-router';
import { useBusiness } from './use-business';
import { IncomingRequests } from './components/IncomingRequests';

export default function ListingRequestsScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const routeId = Array.isArray(listingId) ? listingId[0] : listingId;
  const model = useBusiness();
  const listing = model.listings.find((item) => item.id === routeId);

  if (!listing) {
    return (
      <Screen title="İlana gelen talepler">
        <Feedback
          loading={model.loadingListings}
          error={model.listError}
          retry={() => void model.refreshListings()}
        />
        {!model.loadingListings && !model.listError ? (
          <Feedback error="İlan bulunamadı veya bu işletme hesabına ait değil." />
        ) : null}
        <ActionButton
          title="Geri dön"
          secondary
          onPress={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen title="İlana gelen talepler">
      <ActionButton
        title={`${listing.title} ilanına dön`}
        secondary
        onPress={() =>
          router.dismissTo({
            pathname: '/business/listings/[id]',
            params: { id: listing.id },
          })
        }
      />
      <IncomingRequests model={model} listingId={listing.id} />
    </Screen>
  );
}
