import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/screen';
import { studentDemoService } from '@/features/student/service';
import type { MatchResult } from '@/features/student/matching';

export default function MatchListScreen() {
  const { needId } = useLocalSearchParams<{ needId: string }>();
  const routeNeedId = Array.isArray(needId) ? needId[0] : needId;
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!routeNeedId) return;
      const list = await studentDemoService.listMatches(routeNeedId);
      if (active) {
        setMatches(list);
        setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [routeNeedId]);

  const handleRequest = async (listingId: string, needQuantity: number) => {
    if (!routeNeedId || submittingId) return;

    setSubmittingId(listingId);
    try {
      const request = await studentDemoService.createRequest(routeNeedId, listingId, needQuantity);
      if (request) {
        router.push('/student/requests');
      }
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <Screen title="Uygun ilanlar">
        <Text style={styles.loading}>Uygun ilanlar yükleniyor...</Text>
      </Screen>
    );
  }

  return (
    <Screen title="Uygun ilanlar">
      {matches.length === 0 ? (
        <Text style={styles.empty}>Uygun ilan bulunamadı.</Text>
      ) : (
        matches.map((match) => {
          const thicknessMissing = match.listing.thicknessMm === null;
          const isActionDisabled = !match.eligible || thicknessMissing || submittingId === match.listing.id;
          const statusBoxStyle = match.eligible ? styles.successBox : thicknessMissing ? styles.warningBox : styles.infoBox;
          const statusText = match.eligible
            ? 'Ölçü ve tür projeniz için uygun'
            : thicknessMissing
              ? 'Ölçü uygun fakat kalınlık doğrulanmalı'
              : 'Bu ilan uygun değil';

          return (
            <View key={match.listing.id} style={[styles.card, !match.eligible ? styles.cardDisabled : null]}>
              <Text style={styles.heading}>{match.listing.title}</Text>
              <Text style={styles.body}>Tür: {match.listing.materialType === 'wood' ? 'Ahşap' : match.listing.materialType === 'metal' ? 'Metal' : 'Plastik'}</Text>
              <Text style={styles.body}>Ölçü: {match.listing.widthMm} × {match.listing.heightMm} × {match.listing.thicknessMm ?? 'kalınlık bekleniyor'} mm</Text>
              <Text style={styles.body}>Kullanılabilir adet: {match.listing.quantityOnHand - match.listing.quantityReserved}</Text>
              <Text style={styles.body}>Bölge: {match.listing.region}</Text>
              <Text style={styles.body}>Son teslim: {match.listing.pickupDeadline}</Text>

              <View style={[styles.reasonBox, statusBoxStyle]}>
                <Text style={styles.reason}>{statusText}</Text>
                {match.reasons.map((reason) => (
                  <Text key={reason} style={styles.reason}>{reason}</Text>
                ))}
              </View>

              <Pressable
                disabled={isActionDisabled}
                style={[styles.primaryButton, isActionDisabled ? styles.primaryButtonDisabled : null]}
                onPress={() => {
                  if (!routeNeedId) return;
                  void (async () => {
                    const need = await studentDemoService.getNeed(routeNeedId);
                    if (need) {
                      await handleRequest(match.listing.id, need.quantity);
                    }
                  })();
                }}
              >
                <Text style={styles.primaryButtonText}>{submittingId === match.listing.id ? 'Gönderiliyor...' : 'Talep Gönder'}</Text>
              </Pressable>
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    color: '#3d5148',
    fontSize: 16,
  },
  empty: {
    color: '#3d5148',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe5da',
    padding: 20,
    gap: 8,
    marginBottom: 16,
  },
  cardDisabled: {
    opacity: 0.8,
    backgroundColor: '#f7f7f4',
  },
  heading: {
    color: '#16493e',
    fontSize: 20,
    fontWeight: '700',
  },
  body: {
    color: '#3d5148',
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
    backgroundColor: '#16493e',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#b7c8bc',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
