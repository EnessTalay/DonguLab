import { colors } from '@/theme/tokens';
import { Card } from '@/components/card';
import { DeliveryConfirmation } from './DeliveryConfirmation';
import { StatusBadge } from '@/components/status-badge';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { styles } from '@/components/screen';
import { ActionButton } from '@/components/ui';
import { ChoiceChips } from '@/components/choice-chips';
import { formatDateTime as formatRequestExpiry } from '@/lib/dates';
import { local } from '../styles';
import type { BusinessModel } from '../use-business';

export function IncomingRequests({
  model,
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
  >;
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
  } = model;
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
      <View style={local.listHeading}>
        <Text style={styles.heading}>Gelen talepler</Text>
        {loadingRequests && (
          <ActivityIndicator
            accessibilityLabel="Talepler yükleniyor"
            color={colors.heading}
          />
        )}
      </View>
      {requestActionMessage && (
        <Text
          accessibilityRole="alert"
          style={
            requestActionMessage.type === 'error' ? local.error : local.success
          }
        >
          {requestActionMessage.message}
        </Text>
      )}
      {!!requestListError && (
        <View style={local.listError}>
          <Text accessibilityRole="alert" style={local.error}>
            {requestListError}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={loadingRequests}
            onPress={() => void refreshIncomingRequests()}
            style={local.retryButton}
          >
            <Text style={local.retryText}>Talepleri yeniden yükle</Text>
          </Pressable>
        </View>
      )}
      {!loadingRequests &&
        !requestListError &&
        incomingRequests.length === 0 && (
          <Text style={styles.note}>
            Henüz gelen talep yok. Yeni talepler burada görünecek.
          </Text>
        )}
      {!loadingRequests &&
        !requestListError &&
        incomingRequests.length > 0 &&
        visibleRequests.length === 0 && (
          <Text style={styles.note}>Bu filtrede talep bulunmuyor.</Text>
        )}
      {!loadingRequests &&
        !requestListError &&
        visibleRequests.map(
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
