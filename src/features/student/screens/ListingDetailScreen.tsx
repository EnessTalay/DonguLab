import { AppError } from '@/services/contracts';
import { colors } from '@/theme/tokens';
import { materialLabels } from '@/lib/labels';
import { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ActionButton, Feedback } from '@/components/ui';
import { Card } from '@/components/card';
import { Screen, styles as screenStyles } from '@/components/screen';
import { StatePanel } from '@/components/state-panel';
import { StatusBadge } from '@/components/status-badge';
import { useFocusedResource } from '@/hooks/use-focused-resource';
import { studentService } from '@/features/student/service';
import { compareNeedWithListing } from '@/features/student/comparison';
import { istanbulDate } from '@/lib/dates';
import type { Listing, Need } from '@/types/domain';
import { existingRequestForNeed } from '@/features/student/need-list';

export default function StudentListingDetailScreen() {
  const { id, needId } = useLocalSearchParams<{
    id: string;
    needId?: string;
  }>();
  const routeListingId = Array.isArray(id) ? id[0] : id;
  const routeNeedId = Array.isArray(needId) ? needId[0] : needId;

  const [selectedNeedId, setSelectedNeedId] = useState<string | null>(
    routeNeedId ?? null,
  );
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const inFlight = useRef(false);

  const {
    data,
    loading,
    error,
    errorCode,
    reload,
  } = useFocusedResource(
    useCallback(async () => {
      if (!routeListingId) {
        throw new AppError('NOT_FOUND', 'İlan bağlantısı geçersiz.');
      }
      const [allListings, myNeeds, myRequests] = await Promise.all([
        studentService.getListing(routeListingId),
        studentService.listMyNeeds(),
        studentService.listMyRequests(),
      ]);

      if (!allListings) {
        throw new AppError(
          'NOT_FOUND',
          'İlan bulunamadı veya artık aktif değil.',
        );
      }

      return {
        listing: allListings,
        needs: myNeeds,
        requests: myRequests,
      };
    }, [routeListingId]),
  );

  const listing: Listing | undefined = data?.listing;
  const needs: Need[] = data?.needs ?? [];
  const requests = data?.requests ?? [];

  // Determine current need to compare against
  const activeNeeds = needs.filter((n) => n.status === 'active');
  const effectiveNeedId =
    selectedNeedId && activeNeeds.some((n) => n.id === selectedNeedId)
      ? selectedNeedId
      : activeNeeds[0]?.id ?? null;

  const currentNeed = needs.find((n) => n.id === effectiveNeedId);

  // Check if a request already exists for this listing
  const existingRequest = routeListingId
    ? existingRequestForNeed(requests, routeListingId, effectiveNeedId)
    : undefined;

  const comparison =
    currentNeed && listing
      ? compareNeedWithListing(currentNeed, listing, istanbulDate())
      : null;

  const handleSendRequest = async () => {
    if (!listing || !currentNeed || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setActionError('');
    try {
      const created = await studentService.createRequest(
        currentNeed.id,
        listing.id,
      );
      setShowConfirmation(false);
      router.navigate({
        pathname: '/student/requests/[id]',
        params: { id: created.id, created: '1' },
      });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Talep gönderilemedi.',
      );
      setShowConfirmation(false);
      void reload();
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  if (loading && !listing) {
    return (
      <Screen title="İlan detayı">
        <Feedback loading loadingLabel="İlan detayları yükleniyor…" />
      </Screen>
    );
  }

  if (error || !listing) {
    return (
      <Screen title="İlan detayı">
        <Feedback
          error={error || 'İlan bulunamadı.'}
          errorCode={errorCode}
          retry={() => void reload()}
        />
        <ActionButton
          title="Geri dön"
          secondary
          onPress={() => router.back()}
        />
      </Screen>
    );
  }

  const availableStock = listing.quantityOnHand - listing.quantityReserved;
  const isClosed = listing.status === 'closed';
  const isOutOfStock = availableStock <= 0;
  const isExpired = listing.pickupDeadline < istanbulDate();
  const isMissingThickness = listing.thicknessMm === null;
  const hasObstacle = isClosed || isOutOfStock || isExpired || isMissingThickness;

  return (
    <Screen title={listing.title}>
      {actionError ? (
        <StatePanel
          kind="error"
          title="Talep oluşturulamadı"
          message={actionError}
          action={{
            label: 'Yeniden dene',
            onPress: () => {
              setActionError('');
              void reload();
            },
          }}
        />
      ) : null}

      {/* Existing request banner */}
      {existingRequest ? (
        <View style={styles.existingBox}>
          <View style={styles.existingHeader}>
            <Text style={styles.existingTitle}>
              Bu ilana gönderilmiş mevcut talebiniz var
            </Text>
            <StatusBadge
              status={existingRequest.request.status}
              label={existingRequest.statusLabel}
            />
          </View>
          <Text style={styles.existingText}>
            Bu ilan için talep durumunuz:{' '}
            <Text style={{ fontWeight: '700' }}>
              {existingRequest.statusLabel}
            </Text>
            . Tekrarlı talep oluşturulamaz. Talebinizin durumunu detay ekranından
            takip edebilirsiniz.
          </Text>
          <ActionButton
            title="Mevcut talebi görüntüle →"
            onPress={() =>
              router.navigate({
                pathname: '/student/requests/[id]',
                params: { id: existingRequest.request.id },
              })
            }
          />
        </View>
      ) : null}

      {/* Listing Status / Obstacle Banner */}
      {hasObstacle ? (
        <View style={styles.obstacleBox}>
          <Text style={styles.obstacleTitle}>Talep Engeli</Text>
          <Text style={styles.obstacleMessage}>
            {isClosed
              ? 'Bu ilan işletme tarafından kapatılmıştır. Yeni talep kabul edilmez.'
              : isExpired
                ? 'Bu ilanın son teslim alma tarihi geçmiştir.'
                : isOutOfStock
                  ? 'Bu ilanda kullanılabilir stok kalmamıştır.'
                  : isMissingThickness
                    ? 'İlanda malzeme kalınlığı belirtilmediği için talep gönderilemez.'
                    : 'İlan şu anda talep almaya uygun değildir.'}
          </Text>
        </View>
      ) : null}

      {/* Main Listing Specifications Card */}
      <Card style={screenStyles.card}>
        <Text style={screenStyles.heading}>İlan Özellikleri</Text>

        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Malzeme türü:</Text>
          <Text style={styles.specValue}>
            {materialLabels[listing.materialType]}
          </Text>
        </View>

        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Ölçüler:</Text>
          <Text style={styles.specValue}>
            {listing.widthMm} × {listing.heightMm} mm
          </Text>
        </View>

        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Kalınlık:</Text>
          <Text style={styles.specValue}>
            {listing.thicknessMm !== null
              ? `${listing.thicknessMm} mm`
              : 'Belirtilmemiş (Kalınlık bekleniyor)'}
          </Text>
        </View>

        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Kullanılabilir adet:</Text>
          <Text
            style={[
              styles.specValue,
              availableStock <= 0 ? { color: colors.danger } : null,
            ]}
          >
            {availableStock} adet (Toplam: {listing.quantityOnHand}, Rezerve:{' '}
            {listing.quantityReserved})
          </Text>
        </View>

        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Bölge:</Text>
          <Text style={styles.specValue}>{listing.region}</Text>
        </View>

        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Son teslim tarihi:</Text>
          <Text style={styles.specValue}>{listing.pickupDeadline}</Text>
        </View>

        <View style={styles.specRow}>
          <Text style={styles.specLabel}>İlan durumu:</Text>
          <Text style={styles.specValue}>
            {listing.status === 'active' ? 'Aktif' : 'Kapalı'}
          </Text>
        </View>
      </Card>

      {/* Description & Pickup instructions */}
      <Card style={screenStyles.card}>
        <Text style={screenStyles.heading}>Açıklama ve Teslim Alma</Text>
        <Text style={screenStyles.body}>
          {listing.description || 'Ek açıklama girilmemiş.'}
        </Text>
        <Text style={[screenStyles.heading, { marginTop: 12 }]}>
          Teslim Alma Talimatı
        </Text>
        <Text style={screenStyles.body}>
          {listing.pickupInstructions ||
            'Teslim alma bilgisi belirtilmemiş. Talep onaylandığında işletmeyle iletişime geçebilirsiniz.'}
        </Text>
      </Card>

      {/* Need Selection & Side-by-Side Comparison */}
      <Card style={screenStyles.card}>
        <Text style={screenStyles.heading}>
          İhtiyacınız ile Yan Yana Karşılaştırma
        </Text>

        {activeNeeds.length === 0 ? (
          <StatePanel
            kind="empty"
            title="Aktif ihtiyacınız bulunmuyor"
            message="Bu ilanla karşılaştırma yapmak ve talep göndermek için önce bir ihtiyaç oluşturmalısınız."
            action={{
              label: '+ Yeni İhtiyaç Oluştur',
              onPress: () => router.push('/student/new-need'),
            }}
          />
        ) : (
          <>
            {activeNeeds.length > 1 ? (
              <View style={styles.needSelector}>
                <Text style={styles.selectorLabel}>
                  Karşılaştırılacak İhtiyaç:
                </Text>
                <View style={styles.needChips}>
                  {activeNeeds.map((item) => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      onPress={() => setSelectedNeedId(item.id)}
                      style={[
                        styles.needChip,
                        item.id === effectiveNeedId && styles.needChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.needChipText,
                          item.id === effectiveNeedId &&
                            styles.needChipTextActive,
                        ]}
                      >
                        {item.projectName}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {comparison && currentNeed ? (
              <View style={styles.comparisonTable}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.columnHeader, { flex: 1.1 }]}>Alan</Text>
                  <Text style={[styles.columnHeader, { flex: 1 }]}>İhtiyaç</Text>
                  <Text style={[styles.columnHeader, { flex: 1 }]}>İlan</Text>
                  <Text style={[styles.columnHeader, { flex: 0.9 }]}>Durum</Text>
                </View>

                {comparison.fields.map((field) => {
                  const badgeStyle =
                    field.status === 'eligible'
                      ? styles.badgeEligible
                      : field.status === 'missing'
                        ? styles.badgeMissing
                        : styles.badgeIneligible;

                  const textStyle =
                    field.status === 'eligible'
                      ? styles.badgeTextEligible
                      : field.status === 'missing'
                        ? styles.badgeTextMissing
                        : styles.badgeTextIneligible;

                  return (
                    <View key={field.id} style={styles.tableRow}>
                      <View style={styles.rowMain}>
                        <Text style={[styles.cellText, { flex: 1.1, fontWeight: '600' }]}>
                          {field.label}
                        </Text>
                        <Text style={[styles.cellText, { flex: 1 }]}>
                          {field.needValue}
                        </Text>
                        <Text style={[styles.cellText, { flex: 1 }]}>
                          {field.listingValue}
                        </Text>
                        <View style={[styles.statusPill, badgeStyle, { flex: 0.9 }]}>
                          <Text style={[styles.statusPillText, textStyle]}>
                            {field.statusLabel}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.rowReason}>↳ {field.reason}</Text>
                    </View>
                  );
                })}

                <View style={styles.overallBox}>
                  <Text style={styles.overallTitle}>
                    Genel Uygunluk:{' '}
                    {comparison.canRequest
                      ? 'Talep Gönderilebilir'
                      : 'Talep Gönderilemez'}
                  </Text>
                  {comparison.blockReason ? (
                    <Text style={styles.overallReason}>
                      {comparison.blockReason}
                    </Text>
                  ) : (
                    <Text style={styles.overallSuccess}>
                      Tüm alanlar projenizin gereksinimlerini karşılıyor.
                    </Text>
                  )}
                </View>
              </View>
            ) : null}
          </>
        )}
      </Card>

      {/* Pre-submission Confirmation Summary Modal / View */}
      {showConfirmation && currentNeed ? (
        <Card style={[screenStyles.card, styles.confirmCard]}>
          <Text style={styles.confirmHeader}>Talep Onay Özeti</Text>
          <Text style={screenStyles.body}>
            Lütfen talep göndermeden önce aşağıdaki bilgileri gözden geçirin:
          </Text>

          <View style={styles.confirmDetails}>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Seçilen İhtiyaç:</Text>
              <Text style={styles.confirmValue}>
                {currentNeed.projectName}
              </Text>
            </View>

            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Talep Edilen Miktar:</Text>
              <Text style={styles.confirmValue}>
                {currentNeed.quantity} adet
              </Text>
            </View>

            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Hedef İlan:</Text>
              <Text style={styles.confirmValue}>{listing.title}</Text>
            </View>

            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Teslim Bölgesi:</Text>
              <Text style={styles.confirmValue}>{listing.region}</Text>
            </View>

            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Son Teslim Alma:</Text>
              <Text style={styles.confirmValue}>{listing.pickupDeadline}</Text>
            </View>
          </View>

          <View style={styles.confirmNoticeBox}>
            <Text style={styles.confirmNoticeText}>
              Önemli Bilgi: Talep gönderildiğinde stok hemen rezerve edilmez;
              işletme talebinizi onayladığında malzeme sizin için ayrılacaktır.
            </Text>
          </View>

          <ActionButton
            title={submitting ? 'Gönderiliyor…' : 'Onayla ve Talebi Gönder'}
            loading={submitting}
            disabled={submitting}
            onPress={() => void handleSendRequest()}
          />
          <ActionButton
            title="Vazgeç"
            secondary
            disabled={submitting}
            onPress={() => setShowConfirmation(false)}
          />
        </Card>
      ) : null}

      {/* Actions */}
      {!showConfirmation && (
        <View style={styles.bottomActions}>
          {comparison?.canRequest && !existingRequest ? (
            <ActionButton
              title="Talebi İncele ve Gönder"
              disabled={submitting}
              onPress={() => setShowConfirmation(true)}
            />
          ) : null}

          {existingRequest ? (
            <ActionButton
              title="Mevcut Talebe Git"
              onPress={() =>
                router.navigate({
                  pathname: '/student/requests/[id]',
                  params: { id: existingRequest.request.id },
                })
              }
            />
          ) : null}

          <ActionButton
            title="İlan listesine dön"
            secondary
            onPress={() => router.back()}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f0',
  },
  specLabel: {
    color: colors.muted,
    fontSize: 15,
  },
  specValue: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: 10,
  },
  existingBox: {
    backgroundColor: '#eef5ff',
    borderColor: '#739be6',
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  existingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  existingTitle: {
    color: '#1a4087',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  existingText: {
    color: '#28467d',
    fontSize: 14,
    lineHeight: 20,
  },
  obstacleBox: {
    backgroundColor: '#fff4e5',
    borderColor: '#e8aa53',
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 6,
  },
  obstacleTitle: {
    color: '#8f5200',
    fontSize: 16,
    fontWeight: '700',
  },
  obstacleMessage: {
    color: '#704200',
    fontSize: 14,
    lineHeight: 20,
  },
  needSelector: {
    gap: 8,
    marginBottom: 12,
  },
  selectorLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  needChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  needChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  needChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  needChipText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  needChipTextActive: {
    color: colors.surface,
  },
  comparisonTable: {
    gap: 12,
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    gap: 6,
  },
  columnHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.heading,
  },
  tableRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2ed',
    gap: 4,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cellText: {
    fontSize: 13,
    color: colors.ink,
  },
  rowReason: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 17,
    paddingLeft: 4,
  },
  statusPill: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEligible: {
    backgroundColor: '#e6f7ec',
    borderColor: '#72c78f',
    borderWidth: 1,
  },
  badgeMissing: {
    backgroundColor: '#fff7e6',
    borderColor: '#f2bd57',
    borderWidth: 1,
  },
  badgeIneligible: {
    backgroundColor: '#fdeeed',
    borderColor: '#e88984',
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextEligible: {
    color: '#1e6d3c',
  },
  badgeTextMissing: {
    color: '#8f6005',
  },
  badgeTextIneligible: {
    color: '#9e2d28',
  },
  overallBox: {
    backgroundColor: colors.canvas,
    borderRadius: 12,
    padding: 14,
    gap: 6,
    marginTop: 6,
  },
  overallTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.heading,
  },
  overallReason: {
    fontSize: 13,
    color: colors.danger,
    lineHeight: 18,
  },
  overallSuccess: {
    fontSize: 13,
    color: '#1e6d3c',
    lineHeight: 18,
  },
  confirmCard: {
    borderColor: colors.primary,
    borderWidth: 2,
    gap: 14,
  },
  confirmHeader: {
    color: colors.heading,
    fontSize: 20,
    fontWeight: '700',
  },
  confirmDetails: {
    backgroundColor: '#f8faf7',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confirmLabel: {
    color: colors.muted,
    fontSize: 14,
  },
  confirmValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  confirmNoticeBox: {
    backgroundColor: '#eaf4ee',
    borderRadius: 10,
    padding: 12,
  },
  confirmNoticeText: {
    color: '#215b46',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  bottomActions: {
    gap: 12,
    marginTop: 8,
  },
});
