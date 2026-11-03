import { Card } from '@/components/card';
import { Text } from 'react-native';
import { styles } from '@/components/screen';
import { ActionButton, Feedback } from '@/components/ui';
import { StatePanel } from '@/components/state-panel';
import { ChoiceChips } from '@/components/choice-chips';
import { materialLabels } from '@/lib/labels';
import { istanbulDate as getTodayInIstanbul } from '@/lib/dates';
import type { BusinessModel } from '../use-business';

export function ListingList({
  model,
}: {
  model: Pick<
    BusinessModel,
    | 'listingFilter'
    | 'setListingFilter'
    | 'listings'
    | 'loadingListings'
    | 'listError'
    | 'visibleListings'
    | 'refreshListings'
    | 'setSection'
  >;
}) {
  const {
    listingFilter,
    setListingFilter,
    listings,
    loadingListings,
    listError,
    visibleListings,
    refreshListings,
    setSection,
  } = model;
  return (
    <>
      <ActionButton
        title="Stokları yenile"
        secondary
        disabled={loadingListings}
        onPress={() => void refreshListings()}
      />
      <ChoiceChips
        value={listingFilter}
        onChange={setListingFilter}
        options={[
          { value: 'all', label: 'Tümü' },
          { value: 'available', label: 'Kullanılabilir' },
          { value: 'expired', label: 'Süresi geçmiş' },
        ]}
      />
      <Feedback
        loading={loadingListings}
        loadingLabel="İlanlar yükleniyor…"
        error={listError}
        retry={() => void refreshListings()}
      />
      {!loadingListings && !listError && listings.length === 0 && (
        <StatePanel
          kind="empty"
          title="İlk malzemenizi döngüye katın"
          message="İlan oluşturarak kullanılabilir malzemelerinizi öğrenci projeleriyle buluşturun."
          action={{
            label: 'Yeni ilan oluştur',
            onPress: () => setSection('new'),
          }}
        />
      )}
      {!loadingListings &&
        !listError &&
        listings.length > 0 &&
        visibleListings.length === 0 && (
          <StatePanel
            kind="empty"
            title="Bu filtreye uygun ilan yok"
            message="Diğer ilanları görmek için filtreyi temizleyebilirsiniz."
            action={{
              label: 'Tüm ilanları göster',
              onPress: () => setListingFilter('all'),
            }}
          />
        )}
      {!loadingListings &&
        !listError &&
        visibleListings.map((listing) => (
          <Card key={listing.id} style={styles.card}>
            <Text style={styles.heading}>{listing.title}</Text>
            <Text style={styles.body}>
              {listing.pickupDeadline < getTodayInIstanbul()
                ? 'Süresi geçmiş'
                : listing.quantityOnHand <= listing.quantityReserved
                  ? 'Kullanılabilir stok yok'
                  : listing.thicknessMm === null
                    ? 'Talep için kalınlık bilgisi eksik'
                    : 'Talebe açık'}
            </Text>
            <Text style={styles.body}>
              {materialLabels[listing.materialType]} · {listing.widthMm} ×{' '}
              {listing.heightMm} mm
              {listing.thicknessMm === null
                ? ' · Kalınlık belirtilmemiş'
                : ` · ${listing.thicknessMm} mm kalınlık`}
            </Text>
            <Text style={styles.body}>
              Toplam: {listing.quantityOnHand} · Ayrılmış:{' '}
              {listing.quantityReserved} · Kullanılabilir:{' '}
              {listing.quantityOnHand - listing.quantityReserved}
            </Text>
            <Text style={styles.body}>
              {listing.region} · Son teslim alma: {listing.pickupDeadline}
            </Text>
          </Card>
        ))}
    </>
  );
}
