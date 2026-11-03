import { AppError } from '@/services/contracts';
import { colors } from '@/theme/tokens';
import { materialLabels } from '@/lib/labels';
import { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feedback, ActionButton } from '@/components/ui';
import { ChoiceChips } from '@/components/choice-chips';
import { useFocusedResource } from '@/hooks/use-focused-resource';
import { Screen } from '@/components/screen';
import { studentService, type StudentRequestView } from '@/features/student/service';
import { StatePanel } from '@/components/state-panel';
import { StatusBadge } from '@/components/status-badge';
import { Card } from '@/components/card';
import type { MaterialType, Need } from '@/types/domain';
import {
  getAvailableRegions,
  getListingEmptyState,
} from '@/features/student/listing-filter';

const normalize = (value: string) =>
  value.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');

export default function MatchListScreen() {
  const { needId } = useLocalSearchParams<{ needId: string }>();
  const routeNeedId = Array.isArray(needId) ? needId[0] : needId;

  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [query, setQuery] = useState('');
  const [materialFilter, setMaterialFilter] = useState<'all' | MaterialType>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [eligibilityFilter, setEligibilityFilter] = useState<'eligible' | 'all'>('eligible');
  const [confirmListingId, setConfirmListingId] = useState<string | null>(null);

  const inFlight = useRef(false);

  const { data, loading, error, errorCode, reload } = useFocusedResource(
    useCallback(async () => {
      if (!routeNeedId) {
        throw new AppError('NOT_FOUND', 'İhtiyaç bağlantısı geçersiz.');
      }
      const [matches, need, myRequests] = await Promise.all([
        studentService.listMatches(routeNeedId),
        studentService.getNeed(routeNeedId),
        studentService.listMyRequests(),
      ]);
      return { matches, need, myRequests };
    }, [routeNeedId]),
  );

  const matches = data?.matches ?? [];
  const currentNeed: Need | undefined = data?.need;
  const requests: StudentRequestView[] = data?.myRequests ?? [];

  // Extract all available regions from the matches
  const allListings = matches.map((m) => m.listing);
  const availableRegions = getAvailableRegions(allListings);

  // Apply filters: eligibility, material, region, query
  const normalizedQuery = normalize(query);
  const filteredMatches = matches.filter((match) => {
    // 1. Eligibility filter
    if (eligibilityFilter === 'eligible' && !match.eligible) {
      return false;
    }

    // 2. Material filter
    if (
      materialFilter !== 'all' &&
      match.listing.materialType !== materialFilter
    ) {
      return false;
    }

    // 3. Region filter
    if (
      regionFilter !== 'all' &&
      normalize(match.listing.region) !== normalize(regionFilter)
    ) {
      return false;
    }

    // 4. Text query
    if (normalizedQuery.length > 0) {
      const matText = materialLabels[match.listing.materialType] ?? '';
      const haystack = normalize(
        `${match.listing.title} ${match.listing.description ?? ''} ${match.listing.region} ${matText} ${match.listing.pickupInstructions ?? ''}`,
      );
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }

    return true;
  });

  const handleRequest = async (listingId: string) => {
    if (!routeNeedId || inFlight.current) return;
    inFlight.current = true;
    setSubmittingId(listingId);
    setActionError('');
    try {
      const request = await studentService.createRequest(
        routeNeedId,
        listingId,
      );
      setConfirmListingId(null);
      if (request) {
        router.navigate({
          pathname: '/student/requests/[id]',
          params: { id: request.id, created: '1' },
        });
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Talep gönderilemedi.',
      );
      setConfirmListingId(null);
      void reload();
    } finally {
      inFlight.current = false;
      setSubmittingId(null);
    }
  };

  const resetFilters = () => {
    setQuery('');
    setMaterialFilter('all');
    setRegionFilter('all');
    setEligibilityFilter('all');
  };

  if (loading && !data) {
    return (
      <Screen title="Uygun ilanlar">
        <Feedback loading loadingLabel="Uygun ilanlar yükleniyor…" />
      </Screen>
    );
  }

  const emptyInfo = getListingEmptyState(
    {
      query,
      material: materialFilter,
      region: regionFilter,
      eligibility: eligibilityFilter,
    },
    matches.length,
    filteredMatches.length,
  );

  const confirmMatch = confirmListingId
    ? matches.find((m) => m.listing.id === confirmListingId)
    : null;

  return (
    <Screen title={currentNeed ? `${currentNeed.projectName} · İlanlar` : 'Uygun ilanlar'}>
      <Text style={styles.body}>
        Uygunluk; malzeme, döndürülebilen ölçüler, tam kalınlık, bölge ve
        kullanılabilir stok üzerinden kontrol edilir. Talep gönderildiğinde stok
        hemen ayrılmaz; işletme onayı beklenir.
      </Text>

      {/* Search Input */}
      <TextInput
        accessibilityLabel="İlanlarda ara"
        placeholder="İlan adı, malzeme, açıklama veya bölge ara…"
        value={query}
        onChangeText={setQuery}
        style={styles.searchInput}
      />

      {/* Suitability Chips */}
      <ChoiceChips
        value={eligibilityFilter}
        onChange={setEligibilityFilter}
        options={[
          {
            value: 'eligible',
            label: `Uygun (${matches.filter((m) => m.eligible).length})`,
          },
          { value: 'all', label: `Tüm ilanlar (${matches.length})` },
        ]}
      />

      {/* Material Filter Chips */}
      <ChoiceChips
        value={materialFilter}
        onChange={setMaterialFilter}
        options={[
          { value: 'all', label: 'Tüm malzemeler' },
          { value: 'wood', label: 'Ahşap' },
          { value: 'metal', label: 'Metal' },
          { value: 'plastic', label: 'Plastik' },
        ]}
      />

      {/* Region Filter Chips if multiple regions exist */}
      {availableRegions.length > 1 ? (
        <View style={{ gap: 6 }}>
          <Text style={styles.filterSectionLabel}>Bölgeye göre filtrele:</Text>
          <ChoiceChips
            value={regionFilter}
            onChange={setRegionFilter}
            options={[
              { value: 'all', label: 'Tüm bölgeler' },
              ...availableRegions.map((reg) => ({ value: reg, label: reg })),
            ]}
          />
        </View>
      ) : null}

      <ActionButton
        title="İlanları yenile"
        secondary
        disabled={submittingId !== null}
        onPress={() => void reload()}
      />

      <Feedback
        error={error || actionError}
        errorCode={errorCode}
        retry={() => {
          setActionError('');
          void reload();
        }}
      />

      {/* Pre-submission confirmation summary modal / card */}
      {confirmMatch && currentNeed ? (
        <Card style={styles.confirmCard}>
          <Text style={styles.confirmTitle}>Talep Onay Özeti</Text>
          <Text style={styles.body}>
            Talebinizi iletmeden önce bilgileri kontrol edin:
          </Text>

          <View style={styles.confirmDetails}>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>İhtiyaç Projesi:</Text>
              <Text style={styles.confirmValue}>{currentNeed.projectName}</Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>İstenen Miktar:</Text>
              <Text style={styles.confirmValue}>{currentNeed.quantity} adet</Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Hedef İlan:</Text>
              <Text style={styles.confirmValue}>{confirmMatch.listing.title}</Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Bölge:</Text>
              <Text style={styles.confirmValue}>{confirmMatch.listing.region}</Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Son Teslim Alma:</Text>
              <Text style={styles.confirmValue}>
                {confirmMatch.listing.pickupDeadline}
              </Text>
            </View>
          </View>

          <Text style={styles.confirmNote}>
            Talep işletmeye iletilecektir. İşletme onaylayana kadar stok
            bağlanmaz; onaylandığında malzeme sizin için rezerve edilir.
          </Text>

          <ActionButton
            title={
              submittingId === confirmMatch.listing.id
                ? 'Talebiniz Gönderiliyor…'
                : 'Onayla ve Talebi Gönder'
            }
            loading={submittingId === confirmMatch.listing.id}
            disabled={submittingId !== null}
            onPress={() => void handleRequest(confirmMatch.listing.id)}
          />
          <ActionButton
            title="Vazgeç"
            secondary
            disabled={submittingId !== null}
            onPress={() => setConfirmListingId(null)}
          />
        </Card>
      ) : null}

      {/* Empty State */}
      {!error && filteredMatches.length === 0 ? (
        <StatePanel
          kind="empty"
          title={emptyInfo.title}
          message={emptyInfo.message}
          action={{
            label: emptyInfo.actionLabel,
            onPress: () => {
              if (emptyInfo.actionType === 'clear-query') setQuery('');
              else if (emptyInfo.actionType === 'view-all-eligibility')
                setEligibilityFilter('all');
              else if (emptyInfo.actionType === 'clear-filters') resetFilters();
              else router.dismissTo('/student');
            },
          }}
          secondaryAction={
            emptyInfo.actionType !== 'clear-filters' &&
            (query || materialFilter !== 'all' || regionFilter !== 'all' || eligibilityFilter !== 'eligible')
              ? {
                  label: 'Tüm filtreleri sıfırla',
                  onPress: resetFilters,
                }
              : undefined
          }
        />
      ) : (
        !error &&
        filteredMatches.map((match) => {
          const thicknessMissing = match.listing.thicknessMm === null;
          const availableCount =
            match.listing.quantityOnHand - match.listing.quantityReserved;

          // Check if user already requested this listing
          const existing = requests.find(
            (r) =>
              r.request.listingId === match.listing.id &&
              (!routeNeedId || r.request.needId === routeNeedId) &&
              ['pending', 'approved', 'delivered'].includes(r.request.status),
          );

          const isActionDisabled =
            !match.eligible ||
            thicknessMissing ||
            submittingId !== null ||
            existing !== undefined;

          const statusBoxStyle = match.eligible
            ? styles.successBox
            : thicknessMissing
              ? styles.warningBox
              : styles.infoBox;

          const statusText = match.eligible
            ? 'Ölçü ve tür projeniz için uygun'
            : thicknessMissing
              ? 'Kalınlık bilgisi eksik'
              : 'Bu ilan uygun değil';

          return (
            <View
              key={match.listing.id}
              style={[
                styles.card,
                !match.eligible ? styles.cardDisabled : null,
              ]}
            >
              <View style={styles.cardHeaderRow}>
                <Text style={styles.heading}>{match.listing.title}</Text>
                {existing ? (
                  <StatusBadge
                    status={existing.request.status}
                    label={`Talep: ${existing.statusLabel}`}
                  />
                ) : null}
              </View>

              <Text style={styles.body}>
                Tür: {materialLabels[match.listing.materialType]}
              </Text>
              <Text style={styles.body}>
                Ölçü: {match.listing.widthMm} × {match.listing.heightMm} ×{' '}
                {match.listing.thicknessMm !== null
                  ? `${match.listing.thicknessMm} mm`
                  : 'kalınlık bekleniyor'}
              </Text>
              <Text style={styles.body}>
                Kullanılabilir adet: {availableCount} (Toplam:{' '}
                {match.listing.quantityOnHand})
              </Text>
              <Text style={styles.body}>Bölge: {match.listing.region}</Text>
              <Text style={styles.body}>
                Son teslim: {match.listing.pickupDeadline}
              </Text>

              <View style={[styles.reasonBox, statusBoxStyle]}>
                <Text style={styles.reason}>{statusText}</Text>
                {match.reasons.map((reason) => (
                  <Text key={reason} style={styles.reason}>
                    {reason}
                  </Text>
                ))}
              </View>

              {existing ? (
                <View style={styles.existingAlert}>
                  <Text style={styles.existingAlertText}>
                    Bu ilana zaten talep gönderdiniz ({existing.statusLabel}).
                  </Text>
                  <ActionButton
                    title="Mevcut talebi görüntüle →"
                    onPress={() =>
                      router.navigate({
                        pathname: '/student/requests/[id]',
                        params: { id: existing.request.id },
                      })
                    }
                  />
                </View>
              ) : null}

              <View style={styles.cardActions}>
                <Pressable
                  accessibilityRole="button"
                  style={styles.detailButton}
                  onPress={() => {
                    router.push({
                      pathname: '/student/listings/[id]',
                      params: {
                        id: match.listing.id,
                        needId: routeNeedId,
                      },
                    });
                  }}
                >
                  <Text style={styles.detailButtonText}>
                    İlanı ve Karşılaştırmayı İncele →
                  </Text>
                </Pressable>

                {!existing && match.eligible && !thicknessMissing ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={isActionDisabled}
                    style={[
                      styles.primaryButton,
                      isActionDisabled ? styles.primaryButtonDisabled : null,
                    ]}
                    onPress={() => setConfirmListingId(match.listing.id)}
                  >
                    <Text style={styles.primaryButtonText}>
                      Hızlı Talep Gönder
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 20,
    gap: 8,
    marginBottom: 16,
  },
  cardDisabled: {
    opacity: 0.85,
    backgroundColor: '#f7f7f4',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  heading: {
    color: colors.heading,
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: colors.ink,
  },
  filterSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  reasonBox: {
    borderRadius: 12,
    padding: 10,
    gap: 6,
    marginVertical: 4,
  },
  successBox: {
    backgroundColor: '#ebf8ee',
  },
  warningBox: {
    backgroundColor: '#fff1d9',
  },
  infoBox: {
    backgroundColor: '#edf3ff',
  },
  reason: {
    color: '#2e4e44',
    fontSize: 13,
    lineHeight: 18,
  },
  cardActions: {
    gap: 10,
    marginTop: 8,
  },
  detailButton: {
    backgroundColor: '#f0f5f1',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  detailButtonText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: colors.heading,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#b7c8bc',
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: 15,
  },
  existingAlert: {
    backgroundColor: '#eaf2ff',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginVertical: 4,
  },
  existingAlertText: {
    color: '#1e40af',
    fontSize: 13,
    fontWeight: '600',
  },
  confirmCard: {
    borderWidth: 2,
    borderColor: colors.primary,
    gap: 12,
    marginBottom: 16,
  },
  confirmTitle: {
    color: colors.heading,
    fontSize: 18,
    fontWeight: '700',
  },
  confirmDetails: {
    backgroundColor: '#f7faf7',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confirmLabel: {
    color: colors.muted,
    fontSize: 13,
  },
  confirmValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  confirmNote: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 17,
  },
});
