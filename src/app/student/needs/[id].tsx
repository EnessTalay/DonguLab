import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { Feedback } from '@/components/ui';
import { useFocusedResource } from '@/hooks/use-focused-resource';
import { Screen } from '@/components/screen';
import { studentService } from '@/features/student/service';

export default function NeedDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const routeId = Array.isArray(id) ? id[0] : id;
  const { data: need, loading, error, reload } = useFocusedResource(useCallback(async () => {
    if (!routeId) throw new Error('İhtiyaç bağlantısı geçersiz.');
    const item = await studentService.getNeed(routeId);
    if (!item) throw new Error('İhtiyaç bulunamadı veya bu hesaba ait değil.');
    return item;
  }, [routeId]));

  if (loading || error || !need) {
    return (
      <Screen title="İhtiyaç detayı">
        <Feedback loading={loading} error={error} retry={() => void reload()} />
        <Link href="/student" style={styles.body}>İhtiyaçlarıma dön →</Link>
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
