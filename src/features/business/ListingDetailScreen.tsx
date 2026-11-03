import { ActionButton, Feedback } from '@/components/ui';
import { Card } from '@/components/card';
import { Screen, styles as screenStyles } from '@/components/screen';
import { StatePanel } from '@/components/state-panel';
import { materialLabels } from '@/lib/labels';
import { useLocalSearchParams, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Text } from 'react-native';
import { services } from '@/services';
import type { Listing } from '@/types/domain';
import { istanbulDate } from '@/lib/dates';
import { getErrorMessage } from './errors';
import { ListingForm } from './components/ListingForm';
import { getAvailableStock, getListingAvailability } from './listing-state';
import { requestsForListing } from './listing-requests';
import { useBusiness } from './use-business';

const availabilityLabels = {
  closed: 'Kapalı',
  expired: 'Süresi geçmiş',
  'sold-out': 'Kullanılabilir stok yok',
  'missing-thickness': 'Kalınlık bilgisi eksik · Talep alamaz',
  available: 'Talebe açık',
} as const;

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const routeId = Array.isArray(id) ? id[0] : id;
  const model = useBusiness();
  const [closedListing, setClosedListing] = useState<Listing | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState('');
  const [closeNotice, setCloseNotice] = useState('');
  const closeInFlight = useRef(false);
  const listing =
    closedListing?.id === routeId
      ? closedListing
      : model.updatedListing?.id === routeId
        ? model.updatedListing
        : model.listings.find((item) => item.id === routeId);
  const relatedRequests = routeId
    ? requestsForListing(model.incomingRequests, routeId)
    : [];
  const editing = model.editingListingId === routeId;
  const canEdit =
    listing?.status === 'active' &&
    !model.loadingRequests &&
    !model.requestListError &&
    relatedRequests.length === 0 &&
    listing.quantityReserved === 0;

  const handleClose = async () => {
    if (!routeId || closeInFlight.current) return;
    closeInFlight.current = true;
    setClosing(true);
    setCloseError('');
    setCloseNotice('');
    try {
      const closed = await services.closeListing(routeId);
      setClosedListing(closed);
      setConfirmClose(false);
      const refreshed = await model.loadListings();
      setCloseNotice(
        refreshed
          ? 'İlan kapatıldı. Mevcut taleplerin geçmişi korunuyor.'
          : 'İlan kapatıldı; ancak ilan listesi yenilenemedi. Kaydedilen durum gösteriliyor.',
      );
    } catch (error) {
      setCloseError(getErrorMessage(error));
      setConfirmClose(false);
    } finally {
      closeInFlight.current = false;
      setClosing(false);
    }
  };

  if (!listing) {
    return (
      <Screen title="İlan detayı">
        <Feedback
          loading={model.loadingListings}
          error={model.listError}
          retry={() => void model.refreshListings()}
        />
        {!model.loadingListings && !model.listError ? (
          <StatePanel
            kind="not-found"
            title="İlan bulunamadı"
            message="Bu ilan hesabınıza ait olmayabilir veya artık mevcut değildir."
          />
        ) : null}
        <ActionButton
          title="İlanlarıma dön"
          secondary
          onPress={() => router.back()}
        />
      </Screen>
    );
  }

  if (editing) {
    return (
      <Screen title="İlanı düzenle">
        <ListingForm model={model} />
      </Screen>
    );
  }

  const availability = getListingAvailability(listing, istanbulDate());

  return (
    <Screen title={listing.title}>
      <Card style={screenStyles.card}>
        <Text style={screenStyles.heading}>İlan durumu</Text>
        <Text style={screenStyles.body}>
          {availabilityLabels[availability]}
        </Text>
      </Card>

      <Card style={screenStyles.card}>
        <Text style={screenStyles.heading}>Malzeme ve stok</Text>
        <Text style={screenStyles.body}>
          Malzeme türü: {materialLabels[listing.materialType]}
        </Text>
        <Text style={screenStyles.body}>
          Ölçüler: {listing.widthMm} × {listing.heightMm} mm
        </Text>
        <Text style={screenStyles.body}>
          Kalınlık:{' '}
          {listing.thicknessMm === null
            ? 'Belirtilmemiş'
            : `${listing.thicknessMm} mm`}
        </Text>
        <Text style={screenStyles.body}>
          Toplam stok: {listing.quantityOnHand}
        </Text>
        <Text style={screenStyles.body}>
          Rezerve stok: {listing.quantityReserved}
        </Text>
        <Text style={screenStyles.body}>
          Kullanılabilir stok: {getAvailableStock(listing)}
        </Text>
      </Card>

      <Card style={screenStyles.card}>
        <Text style={screenStyles.heading}>Açıklama</Text>
        <Text style={screenStyles.body}>
          {listing.description || 'Bu ilan için ek açıklama girilmemiş.'}
        </Text>
      </Card>

      <Card style={screenStyles.card}>
        <Text style={screenStyles.heading}>Teslim alma</Text>
        <Text style={screenStyles.body}>Bölge: {listing.region}</Text>
        <Text style={screenStyles.body}>
          Son teslim alma tarihi: {listing.pickupDeadline}
        </Text>
        <Text style={screenStyles.body}>
          {listing.pickupInstructions ||
            'Teslim alma bilgisi paylaşılmamış. Talep onayından sonra işletmeyle iletişime geçin.'}
        </Text>
      </Card>

      <Card style={screenStyles.card}>
        <Text style={screenStyles.heading}>Bu ilana gelen talepler</Text>
        <Feedback
          loading={model.loadingRequests}
          error={model.requestListError}
          retry={() => void model.refreshIncomingRequests()}
        />
        {!model.loadingRequests &&
        !model.requestListError &&
        relatedRequests.length === 0 ? (
          <StatePanel
            kind="empty"
            title="Henüz talep yok"
            message="Öğrenciler bu ilana talep gönderdiğinde burada görebilirsiniz."
          />
        ) : null}
        {!model.loadingRequests &&
        !model.requestListError &&
        relatedRequests.length > 0 ? (
          <ActionButton
            title={`Gelen talepleri gör (${relatedRequests.length})`}
            secondary
            onPress={() =>
              router.push({
                pathname: '/business/requests/[listingId]',
                params: { listingId: listing.id },
              })
            }
          />
        ) : null}
      </Card>

      {model.feedback && !editing ? (
        <StatePanel
          kind={model.feedback.type === 'error' ? 'error' : 'success'}
          title={
            model.feedback.type === 'error'
              ? 'İlan güncellenemedi'
              : model.feedback.type === 'warning'
                ? 'İlan güncellendi'
                : 'İlan bilgileri güncellendi'
          }
          message={model.feedback.message}
          action={
            model.feedback.type === 'warning'
              ? {
                  label: 'İlanları yenile',
                  onPress: () => void model.refreshListings(),
                }
              : undefined
          }
        />
      ) : null}

      {closeNotice ? (
        <StatePanel
          kind="success"
          title="İlan kapatıldı"
          message={closeNotice}
          action={
            closeNotice.includes('yenilenemedi')
              ? {
                  label: 'İlanları yenile',
                  onPress: () => void model.refreshListings(),
                }
              : undefined
          }
        />
      ) : null}
      {closeError ? (
        <StatePanel
          kind="error"
          title="İlan kapatılamadı"
          message={closeError}
          action={{
            label: 'Tekrar dene',
            onPress: () => {
              setCloseError('');
              setConfirmClose(true);
            },
          }}
        />
      ) : null}

      <ActionButton
        title="İlan bilgilerini düzenle"
        secondary
        disabled={!canEdit || closing}
        onPress={() => model.beginListingEdit(listing)}
      />
      {!canEdit && listing.status === 'active' ? (
        <Text style={screenStyles.note}>
          Açık talep, talep geçmişi veya rezerve stok bulunan ilanlar
          düzenlenemez. Mevcut kayıtları korumak için bu işlem servis ve backend
          tarafından da denetlenir.
        </Text>
      ) : null}

      {confirmClose && listing.status === 'active' ? (
        <Card style={screenStyles.card}>
          <Text style={screenStyles.heading}>İlan kapatılsın mı?</Text>
          <Text style={screenStyles.body}>
            İlan yeni talep almaz. Mevcut talep ve teslimat geçmişi silinmez;
            bekleyen veya onaylanmış talepler varsa kapatma reddedilir.
          </Text>
          <ActionButton
            title={closing ? 'Kapatılıyor…' : 'Evet, ilanı kapat'}
            loading={closing}
            disabled={closing}
            onPress={() => void handleClose()}
          />
          <ActionButton
            title="Vazgeç"
            secondary
            disabled={closing}
            onPress={() => setConfirmClose(false)}
          />
        </Card>
      ) : listing.status === 'active' ? (
        <ActionButton
          title="İlanı kapat"
          secondary
          disabled={closing}
          onPress={() => setConfirmClose(true)}
        />
      ) : null}
    </Screen>
  );
}
