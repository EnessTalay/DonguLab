import { AppError } from '@/services/contracts';
import { colors } from '@/theme/tokens';
import { Card } from '@/components/card';
import { materialLabels } from '@/lib/labels';
import { useCallback } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ActionButton, Feedback } from '@/components/ui';
import { StatePanel } from '@/components/state-panel';
import { useFocusedResource } from '@/hooks/use-focused-resource';
import { Screen } from '@/components/screen';
import { studentService } from '@/features/student/service';

export default function NeedDetailScreen() {
  const { id, created } = useLocalSearchParams<{
    id: string;
    created?: string;
  }>();
  const routeId = Array.isArray(id) ? id[0] : id;
  const {
    data: need,
    loading,
    error,
    errorCode,
    reload,
  } = useFocusedResource(
    useCallback(async () => {
      if (!routeId)
        throw new AppError('NOT_FOUND', 'İhtiyaç bağlantısı geçersiz.');
      const item = await studentService.getNeed(routeId);
      if (!item)
        throw new AppError(
          'NOT_FOUND',
          'İhtiyaç bulunamadı veya bu hesaba ait değil.',
        );
      return item;
    }, [routeId]),
  );

  if (loading || error || !need) {
    return (
      <Screen title="İhtiyaç detayı">
        <Feedback
          loading={loading}
          error={error}
          errorCode={errorCode}
          retry={() => void reload()}
        />
        <ActionButton
          title="İhtiyaçlarıma dön"
          secondary
          onPress={() => router.dismissTo('/student')}
        />
      </Screen>
    );
  }

  return (
    <Screen title={need.projectName}>
      {created === '1' && (
        <StatePanel
          kind="success"
          title="İhtiyacın kaydedildi"
          message="Şimdi ölçülerine uygun malzeme ilanlarını inceleyebilirsin."
        />
      )}
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

      <ActionButton
        title="Uygun ilanları gör"
        onPress={() =>
          router.push({
            pathname: '/student/matches/[needId]',
            params: { needId: need.id },
          })
        }
      />
      <ActionButton
        title="İhtiyaç listesine dön"
        secondary
        onPress={() => router.dismissTo('/student')}
      />
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

});
