import { colors } from '@/theme/tokens';
import { Card } from '@/components/card';
import { DeliveryConfirmation } from './DeliveryConfirmation';
import { StatusBadge } from '@/components/status-badge';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { styles } from '@/components/screen';
import { ActionButton, Feedback } from '@/components/ui';
import { StatePanel } from '@/components/state-panel';
import { ChoiceChips } from '@/components/choice-chips';
import { formatDateTime as formatRequestExpiry } from '@/lib/dates';
import { local } from '../styles';
import type { BusinessModel } from '../use-business';
import { requestsForListing } from '../listing-requests';

export function IncomingRequests({
  model,
  listingId,
}: {
  model: Pick<
    BusinessModel,
    | 'requestFilter'
    | 'setRequestFilter'
    | 'loadingListings'
    | 'incomingRequests'
    | 'loadingRequests'
    | 'requestListError'
    | 'requestActionMessage'
    | 'activeRequestAction'
    | 'visibleRequests'
    | 'refreshIncomingRequests'
    | 'refreshRequestActionData'
    | 'handleRequestAction'
    | 'deliveryCodes'
    | 'setDeliveryCodes'
    | 'handleDeliveryConfirmation'
    | 'setSection'
  >;
  listingId?: string;
}) {
  const {
    requestFilter,
    setRequestFilter,
    loadingListings,
    incomingRequests,
    loadingRequests,
    requestListError,
    requestActionMessage,
    activeRequestAction,
    visibleRequests,
    refreshIncomingRequests,
    refreshRequestActionData,
    handleRequestAction,
    setSection,
  } = model;
  const listingRequests = listingId
    ? requestsForListing(incomingRequests, listingId)
    : incomingRequests;
  const listingVisibleRequests = listingId
    ? requestsForListing(visibleRequests, listingId)
    : visibleRequests;
  return (
    <>
      <ActionButton
        title="Talepleri ve stokları yenile"
        secondary
        disabled={
          loadingRequests || loadingListings || activeRequestAction !== null
        }
        onPress={() => void refreshRequestActionData()}
      />
      <ChoiceChips
        value={requestFilter}
        onChange={setRequestFilter}
        options={[
          { value: 'active', label: 'İşlem bekleyen' },
          { value: 'history', label: 'Geçmiş' },
          { value: 'all', label: 'Tümü' },
        ]}
      />
      {requestActionMessage && (
        <StatePanel
          kind={requestActionMessage.type === 'success' ? 'success' : 'error'}
          title={
            requestActionMessage.type === 'success'
              ? 'İşlem tamamlandı'
              : 'İşlem tamamlanamadı'
          }
          message={requestActionMessage.message}
        />
      )}
      <Feedback
        loading={loadingRequests}
        loadingLabel="Talepler yükleniyor…"
        error={requestListError}
        retry={() => void refreshIncomingRequests()}
      />
      {!loadingRequests &&
        !requestListError &&
        listingRequests.length === 0 && (
          <StatePanel
            kind="empty"
            title={
              listingId ? 'Bu ilana gelen talep yok' : 'Henüz gelen talep yok'
            }
            message={
              listingId
                ? 'Öğrenciler bu ilana talep gönderdiğinde burada görünecek.'
                : 'Öğrenciler ilanlarınıza talep gönderdiğinde burada görünecek.'
            }
            action={{
              label: listingId ? 'İlan detayına dön' : 'İlanlarımı incele',
              onPress: () =>
                listingId ? router.back() : setSection('listings'),
            }}
          />
        )}
      {!loadingRequests &&
        !requestListError &&
      listingRequests.length > 0 &&
      listingVisibleRequests.length === 0 && (
          <StatePanel
            kind="empty"
            title="Bu filtrede talep yok"
            message="Diğer durumdaki talepleri görmek için tümünü seçebilirsiniz."
            action={{
              label: 'Tüm talepleri göster',
              onPress: () => setRequestFilter('all'),
            }}
          />
        )}
      {!loadingRequests &&
        !requestListError &&
      listingVisibleRequests.map(
          ({ request, listingTitle, projectName, expiresAt }) => {
            const pending = request.status === 'pending';
            const actionInProgress =
              activeRequestAction?.requestId === request.id;
            return (
              <Card key={request.id} style={styles.card}>
                <View style={local.requestTitleRow}>
                  <Text style={[styles.heading, local.requestTitle]}>
                    {listingTitle}
                  </Text>
                  <StatusBadge
                    status={request.status}
                    style={[
                      local.statusBadge,
                      { borderWidth: 0 },
                      request.status === 'pending' && local.pendingBadge,
                    ]}
                    textStyle={[
                      local.statusText,
                      request.status === 'pending' && local.pendingStatusText,
                    ]}
                  />
                </View>
                <Text style={styles.body}>Öğrenci projesi: {projectName}</Text>
                <Text style={styles.body}>
                  Talep edilen miktar: {request.quantity} adet
                </Text>
                {expiresAt && formatRequestExpiry(expiresAt) && (
                  <Text style={styles.body}>
                    Rezervasyon sonu: {formatRequestExpiry(expiresAt)}
                  </Text>
                )}
                {pending && (
                  <View style={local.requestActions}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={activeRequestAction !== null}
                      onPress={() =>
                        void handleRequestAction(request.id, 'approve')
                      }
                      style={[
                        local.actionButton,
                        local.approveButton,
                        activeRequestAction !== null && local.disabledButton,
                      ]}
                    >
                      {actionInProgress &&
                      activeRequestAction?.action === 'approve' ? (
                        <ActivityIndicator color={colors.surface} />
                      ) : (
                        <Text style={local.actionButtonText}>Onayla</Text>
                      )}
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={activeRequestAction !== null}
                      onPress={() =>
                        void handleRequestAction(request.id, 'reject')
                      }
                      style={[
                        local.actionButton,
                        local.rejectButton,
                        activeRequestAction !== null && local.disabledButton,
                      ]}
                    >
                      {actionInProgress &&
                      activeRequestAction?.action === 'reject' ? (
                        <ActivityIndicator color="#8b2f24" />
                      ) : (
                        <Text style={local.rejectButtonText}>Reddet</Text>
                      )}
                    </Pressable>
                  </View>
                )}
                {request.status === 'approved' && (
                  <DeliveryConfirmation requestId={request.id} model={model} />
                )}
              </Card>
            );
          },
        )}
    </>
  );
}
