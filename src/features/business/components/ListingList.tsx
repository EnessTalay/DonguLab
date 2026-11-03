import { Card } from '@/components/card';
import { Text, View } from 'react-native';
import { styles } from '@/components/screen';
import { ActionButton, Feedback } from '@/components/ui';
import { StatePanel } from '@/components/state-panel';
import { ChoiceChips } from '@/components/choice-chips';
import { materialLabels } from '@/lib/labels';
import { istanbulDate as getTodayInIstanbul } from '@/lib/dates';
import { router } from 'expo-router';
import type { BusinessModel } from '../use-business';
import { getAvailableStock, getListingAvailability } from '../listing-state';

const availabilityLabels = {
  closed: 'Kapalı',
  expired: 'Süresi geçmiş',
  'sold-out': 'Kullanılabilir stok yok',
  'missing-thickness': 'Kalınlık bilgisi eksik · Talep alamaz',
  available: 'Talebe açık',
} as const;

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
          { value: 'all', label: `Tümü (${listings.length})` },
          {
            value: 'available',
            label: `Talebe açık (${listings.filter((item) => getListingAvailability(item, getTodayInIstanbul()) === 'available').length})`,
          },
          {
            value: 'out-of-stock',
            label: `Stok yok (${listings.filter((item) => getListingAvailability(item, getTodayInIstanbul()) === 'sold-out').length})`,
          },
          {
            value: 'expired',
            label: `Süresi geçmiş (${listings.filter((item) => getListingAvailability(item, getTodayInIstanbul()) === 'expired').length})`,
          },
          {
            value: 'closed',
            label: `Kapalı (${listings.filter((item) => item.status === 'closed').length})`,
          },
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
              {availabilityLabels[
                getListingAvailability(listing, getTodayInIstanbul())
              ]}
            </Text>
            <Text style={styles.body}>
              {materialLabels[listing.materialType]} · {listing.widthMm} ×{' '}
              {listing.heightMm} mm
              {listing.thicknessMm === null
                ? ' · Kalınlık belirtilmemiş'
                : ` · ${listing.thicknessMm} mm kalınlık`}
            </Text>
            <Text style={styles.body}>
              Toplam stok: {listing.quantityOnHand} · Rezerve stok:{' '}
              {listing.quantityReserved} · Kullanılabilir stok:{' '}
              {getAvailableStock(listing)}
            </Text>
            <Text style={styles.body}>
              {listing.region} · Son teslim alma: {listing.pickupDeadline}
            </Text>
            {listing.description ? (
              <Text style={styles.body}>{listing.description}</Text>
            ) : null}
            <View>
              <ActionButton
                title="İlan detayını aç"
                secondary
                onPress={() =>
                  router.push({
                    pathname: '/business/listings/[id]',
                    params: { id: listing.id },
                  })
                }
              />
            </View>
          </Card>
        ))}
    </>
  );
}
