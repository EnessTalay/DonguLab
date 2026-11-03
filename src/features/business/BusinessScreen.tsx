import { Screen } from '@/components/screen';
import { ChoiceChips } from '@/components/choice-chips';
import { Metrics } from '@/components/ui';
import { useBusiness } from './use-business';
import { ListingForm } from './components/ListingForm';
import { ListingList } from './components/ListingList';
import { IncomingRequests } from './components/IncomingRequests';

export default function BusinessScreen() {
  const model = useBusiness();
  const {
    section,
    setSection,
    listings,
    loadingListings,
    listError,
    incomingRequests,
    loadingRequests,
    requestListError,
    activeRequestAction,
    submitting,
  } = model;
  return (
    <Screen title="Malzemelerin değer kazansın">
      <ChoiceChips
        value={section}
        onChange={setSection}
        disabled={submitting || activeRequestAction !== null}
        options={[
          { value: 'listings', label: 'İlanlarım' },
          { value: 'requests', label: 'Gelen talepler' },
          { value: 'new', label: '+ Yeni ilan' },
        ]}
      />
      {!loadingListings &&
        !loadingRequests &&
        !listError &&
        !requestListError && (
          <Metrics
            items={[
              { label: 'Malzeme ilanı', value: listings.length },
              {
                label: 'Bekleyen talep',
                value: incomingRequests.filter(
                  (item) => item.request.status === 'pending',
                ).length,
              },
              {
                label: 'Teslim bekliyor',
                value: incomingRequests.filter(
                  (item) => item.request.status === 'approved',
                ).length,
              },
            ]}
          />
        )}
      {section === 'new' && <ListingForm model={model} />}
      {section === 'listings' && <ListingList model={model} />}
      {section === 'requests' && <IncomingRequests model={model} />}
    </Screen>
  );
}
