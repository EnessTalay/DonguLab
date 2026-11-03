import { colors } from '@/theme/tokens';
import { materialLabels } from '@/lib/labels';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { Feedback, ActionButton } from '@/components/ui';
import { ChoiceChips } from '@/components/choice-chips';
import { useFocusedResource } from '@/hooks/use-focused-resource';
import { Screen } from '@/components/screen';
import { studentService } from '@/features/student/service';

export default function MatchListScreen() {
  const { needId } = useLocalSearchParams<{ needId: string }>();
  const routeNeedId = Array.isArray(needId) ? needId[0] : needId;
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [filter, setFilter] = useState<'eligible' | 'all'>('eligible');
  const { data, loading, error, reload } = useFocusedResource(
    useCallback(async () => {
      if (!routeNeedId) throw new Error('İhtiyaç bağlantısı geçersiz.');
      return studentService.listMatches(routeNeedId);
    }, [routeNeedId]),
  );
  const matches = data ?? [];
  const visibleMatches =
    filter === 'eligible' ? matches.filter((match) => match.eligible) : matches;

  const handleRequest = async (listingId: string) => {
    if (!routeNeedId || submittingId) return;

    setSubmittingId(listingId);
    setActionError('');
    try {
      const request = await studentService.createRequest(
        routeNeedId,
        listingId,
      );
      if (request) {
        router.replace('/student/requests');
      }
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Talep gönderilemedi.',
      );
      void reload();
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <Screen title="Uygun ilanlar">
        <Feedback loading />
      </Screen>
    );
  }

  return (
    <Screen title="Uygun ilanlar">
      <Text style={styles.body}>
        Uygunluk; malzeme, döndürülebilen ölçüler, tam kalınlık, bölge ve
        kullanılabilir stok üzerinden kontrol edilir. Talep gönderildiğinde stok
        ayrılmaz; işletme onayı beklenir.
      </Text>
      <ChoiceChips
        value={filter}
        onChange={setFilter}
        options={[
          {
            value: 'eligible',
            label: `Uygun (${matches.filter((match) => match.eligible).length})`,
          },
          { value: 'all', label: `Tüm ilanlar (${matches.length})` },
        ]}
      />
      <ActionButton
        title="İlanları yenile"
        secondary
        disabled={submittingId !== null}
        onPress={() => void reload()}
      />
      <Feedback
        error={error || actionError}
        retry={() => {
          setActionError('');
          void reload();
        }}
      />
      {!error && visibleMatches.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.heading}>Şu an uygun ilan yok</Text>
          <Text style={styles.body}>
            Tüm ilanlar sekmesinden uygun olmayan ilanların nedenlerini
            inceleyebilir veya daha sonra yeniden kontrol edebilirsin.
          </Text>
          <Link href="/student" style={styles.body}>
            İhtiyaçlarıma dön →
          </Link>
        </View>
      ) : (
        !error &&
        visibleMatches.map((match) => {
          const thicknessMissing = match.listing.thicknessMm === null;
          const isActionDisabled =
            !match.eligible || thicknessMissing || submittingId !== null;
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
              <Text style={styles.heading}>{match.listing.title}</Text>
              <Text style={styles.body}>
                Tür: {materialLabels[match.listing.materialType]}
              </Text>
              <Text style={styles.body}>
                Ölçü: {match.listing.widthMm} × {match.listing.heightMm} ×{' '}
                {match.listing.thicknessMm ?? 'kalınlık bekleniyor'} mm
              </Text>
              <Text style={styles.body}>
                Kullanılabilir adet:{' '}
                {match.listing.quantityOnHand - match.listing.quantityReserved}
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

              <Pressable
                accessibilityRole="button"
                disabled={isActionDisabled}
                style={[
                  styles.primaryButton,
                  isActionDisabled ? styles.primaryButtonDisabled : null,
                ]}
                onPress={() => {
                  if (!routeNeedId) return;
                  void handleRequest(match.listing.id);
                }}
              >
                <Text style={styles.primaryButtonText}>
                  {submittingId === match.listing.id
                    ? 'Gönderiliyor...'
                    : 'Talep Gönder'}
                </Text>
              </Pressable>
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
    opacity: 0.8,
    backgroundColor: '#f7f7f4',
  },
  heading: {
    color: colors.heading,
    fontSize: 20,
    fontWeight: '700',
  },
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  reasonBox: {
    borderRadius: 12,
    padding: 10,
    gap: 6,
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
});
