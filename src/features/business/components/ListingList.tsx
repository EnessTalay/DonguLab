import { colors } from '@/theme/tokens';
import { Card } from '@/components/card';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { styles } from '@/components/screen';
import { ActionButton } from '@/components/ui';
import { ChoiceChips } from '@/components/choice-chips';
import { materialLabels } from '@/lib/labels';
import { istanbulDate as getTodayInIstanbul } from '@/lib/dates';
import { local } from '../styles';
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
      <View style={local.listHeading}>
        <Text style={styles.heading}>İlanlarım</Text>
        {loadingListings && (
          <ActivityIndicator
            accessibilityLabel="İlanlar yükleniyor"
            color={colors.heading}
          />
        )}
      </View>
      {!!listError && (
        <View style={local.listError}>
          <Text accessibilityRole="alert" style={local.error}>
            {listError}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void refreshListings()}
            style={local.retryButton}
          >
            <Text style={local.retryText}>Yeniden dene</Text>
          </Pressable>
        </View>
      )}
      {!loadingListings && !listError && listings.length === 0 && (
        <Text style={styles.note}>
          Henüz ilanınız yok. Yeni ilan sekmesinden ilk malzemenizi ekleyin.
        </Text>
      )}
      {!loadingListings &&
        !listError &&
        listings.length > 0 &&
        visibleListings.length === 0 && (
          <Text style={styles.note}>Bu filtreye uygun ilan yok.</Text>
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
