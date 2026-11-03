import { colors } from '@/theme/tokens';
import { Card } from '@/components/card';
import { materialLabels } from '@/lib/labels';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { Feedback } from '@/components/ui';
import { useFocusedResource } from '@/hooks/use-focused-resource';
import { Screen } from '@/components/screen';
import { studentService } from '@/features/student/service';

export default function NeedDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const routeId = Array.isArray(id) ? id[0] : id;
  const {
    data: need,
    loading,
    error,
    reload,
  } = useFocusedResource(
    useCallback(async () => {
      if (!routeId) throw new Error('İhtiyaç bağlantısı geçersiz.');
      const item = await studentService.getNeed(routeId);
      if (!item)
        throw new Error('İhtiyaç bulunamadı veya bu hesaba ait değil.');
      return item;
    }, [routeId]),
  );

  if (loading || error || !need) {
    return (
      <Screen title="İhtiyaç detayı">
        <Feedback loading={loading} error={error} retry={() => void reload()} />
        <Link href="/student" style={styles.body}>
          İhtiyaçlarıma dön →
        </Link>
      </Screen>
    );
  }

  return (
    <Screen title={need.projectName}>
      <Card style={styles.card}>
        <Text style={styles.heading}>İhtiyaç özeti</Text>
        <Text style={styles.body}>
          Malzeme: {materialLabels[need.materialType]}
        </Text>
        <Text style={styles.body}>
          Ölçü: {need.widthMm} × {need.heightMm} mm
        </Text>
        <Text style={styles.body}>
          Kalınlık:{' '}
          {need.thicknessMm === null
            ? 'Doğrulanacak'
            : `${need.thicknessMm} mm`}
        </Text>
        <Text style={styles.body}>Adet: {need.quantity}</Text>
        <Text style={styles.body}>Bölge: {need.region}</Text>
        <Text style={styles.body}>İhtiyaç tarihi: {need.neededBy}</Text>
      </Card>

      <Link
        href={{
          pathname: '/student/matches/[needId]',
          params: { needId: need.id },
        }}
        asChild
      >
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
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 22,
    gap: 8,
  },
  heading: {
    color: colors.heading,
    fontSize: 20,
    fontWeight: '700',
  },
  body: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 25,
  },
  primaryButton: {
    backgroundColor: colors.heading,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#eef3ef',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.heading,
    fontWeight: '700',
    fontSize: 16,
  },
});
