import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/screen';
import { studentDemoService } from '@/features/student/service';
import type { Need } from '@/types/domain';

export default function NeedDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const routeId = Array.isArray(id) ? id[0] : id;
  const [need, setNeed] = useState<Need | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!routeId) return;
      const item = await studentDemoService.getNeed(routeId);
      if (!cancelled) {
        setNeed(item ?? null);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [routeId]);

  if (!need) {
    return (
      <Screen title="İhtiyaç detayı">
        <Text style={styles.empty}>İhtiyaç bulunamadı.</Text>
      </Screen>
    );
  }

  return (
    <Screen title={need.projectName}>
      <View style={styles.card}>
        <Text style={styles.heading}>İhtiyaç özeti</Text>
        <Text style={styles.body}>Malzeme: {need.materialType === 'wood' ? 'Ahşap' : need.materialType === 'metal' ? 'Metal' : 'Plastik'}</Text>
        <Text style={styles.body}>Ölçü: {need.widthMm} × {need.heightMm} mm</Text>
        <Text style={styles.body}>Kalınlık: {need.thicknessMm === null ? 'Doğrulanacak' : `${need.thicknessMm} mm`}</Text>
        <Text style={styles.body}>Adet: {need.quantity}</Text>
        <Text style={styles.body}>Bölge: {need.region}</Text>
        <Text style={styles.body}>İhtiyaç tarihi: {need.neededBy}</Text>
      </View>

      <Link href={{ pathname: '/student/matches/[needId]', params: { needId: need.id } }} asChild>
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Uygun ilanları gör</Text>
        </Pressable>
      </Link>

      <Link href="/student" asChild>
        <Pressable style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>İhtiyaç listesine dön</Text>
        </Pressable>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe5da',
    padding: 22,
    gap: 8,
  },
  heading: {
    color: '#16493e',
    fontSize: 20,
    fontWeight: '700',
  },
  body: {
    color: '#3d5148',
    fontSize: 16,
    lineHeight: 25,
  },
  primaryButton: {
    backgroundColor: '#16493e',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#eef3ef',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe5da',
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#16493e',
    fontWeight: '700',
    fontSize: 16,
  },
  empty: {
    color: '#3d5148',
    fontSize: 16,
  },
});
