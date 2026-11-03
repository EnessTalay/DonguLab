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
    if (!routeNeedId) return;

    const request = await studentDemoService.createRequest(routeNeedId, listingId, needQuantity);
    if (request) {
      router.push('/student/requests');
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
        matches.map((match) => (
          <View key={match.listing.id} style={[styles.card, !match.eligible ? styles.cardDisabled : null]}>
            <Text style={styles.heading}>{match.listing.title}</Text>
            <Text style={styles.body}>Tür: {match.listing.materialType === 'wood' ? 'Ahşap' : match.listing.materialType === 'metal' ? 'Metal' : 'Plastik'}</Text>
            <Text style={styles.body}>Ölçü: {match.listing.widthMm} × {match.listing.heightMm} mm</Text>
            <Text style={styles.body}>Kalınlık: {match.listing.thicknessMm === null ? 'Doğrulanmalı' : `${match.listing.thicknessMm} mm`}</Text>
            <Text style={styles.body}>Kullanılabilir stok: {match.listing.quantityOnHand - match.listing.quantityReserved}</Text>
            <Text style={styles.body}>Bölge: {match.listing.region}</Text>
            <Text style={styles.body}>Son teslim: {match.listing.pickupDeadline}</Text>
            <View style={styles.reasonBox}>
              {match.reasons.map((reason) => (
                <Text key={reason} style={styles.reason}>{reason}</Text>
              ))}
            </View>

            {match.eligible ? (
              <Pressable style={styles.primaryButton} onPress={() => void (async () => {
                const need = await studentDemoService.getNeed(routeNeedId ?? '');
                if (need) {
                  await handleRequest(match.listing.id, need.quantity);
                }
              })()}>
                <Text style={styles.primaryButtonText}>Talep gönder</Text>
              </Pressable>
            ) : (
              <Text style={styles.ineligible}>Uygun değil; talep gönderilemez.</Text>
            )}
          </View>
        ))
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
    backgroundColor: '#edf5ee',
    padding: 10,
    gap: 6,
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
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  ineligible: {
    color: '#7f6138',
    fontWeight: '600',
    fontSize: 14,
  },
});
