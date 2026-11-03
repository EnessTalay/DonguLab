import { colors } from '@/theme/tokens';
import { materialLabels } from '@/lib/labels';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Feedback, Metrics } from '@/components/ui';
import { router } from 'expo-router';
import { Screen, styles as screenStyles } from '@/components/screen';
import { studentService } from '@/features/student/service';
import { useFocusedResource } from '@/hooks/use-focused-resource';
import { StatePanel } from '@/components/state-panel';

export default function StudentScreen() {
  const [query, setQuery] = useState('');
  const { data, loading, error, reload } = useFocusedResource(
    useCallback(() => studentService.listMyNeeds(), []),
  );
  const needs = data ?? [];
  const normalize = (value: string) => value.toLocaleLowerCase('tr-TR').trim();
  const visibleNeeds = needs.filter((need) =>
    normalize(`${need.projectName} ${need.region}`).includes(normalize(query)),
  );

  return (
    <Screen title="İhtiyaçlarım">
      <Text style={screenStyles.body}>
        Projelerin için doğru malzemeyi bul. İhtiyaçlarını tek yerden takip et.
      </Text>
      {!loading && !error && (
        <Metrics
          items={[
            { label: 'İhtiyaç kaydı', value: needs.length },
            {
              label: 'Toplam malzeme adedi',
              value: needs.reduce((total, need) => total + need.quantity, 0),
            },
          ]}
        />
      )}

      <View style={styles.toolbar}>
        <ActionButton
          title="+ Yeni ihtiyaç"
          onPress={() => router.push('/student/new-need')}
        />
        <ActionButton
          title="Taleplerim"
          secondary
          onPress={() => router.navigate('/student/requests')}
        />
      </View>

      <TextInput
        accessibilityLabel="İhtiyaçlarda ara"
        placeholder="Proje adı veya bölge ara…"
        value={query}
        onChangeText={setQuery}
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          padding: 16,
          fontSize: 16,
          color: colors.ink,
        }}
      />
      <Feedback loading={loading} error={error} retry={() => void reload()} />
      {!loading &&
        !error &&
        (visibleNeeds.length === 0 ? (
          <StatePanel
            kind="empty"
            title={
              query ? 'Aramana uygun ihtiyaç yok' : 'İlk projenle başlayalım'
            }
            message={
              query
                ? 'Başka bir proje adı veya bölge deneyebilirsin.'
                : 'Ölçüleri girerek projen için uygun malzemeleri bulabilirsin.'
            }
            action={
              query
                ? { label: 'Aramayı temizle', onPress: () => setQuery('') }
                : {
                    label: 'Yeni ihtiyaç oluştur',
                    onPress: () => router.push('/student/new-need'),
                  }
            }
          />
        ) : (
          visibleNeeds.map((need) => (
            <Pressable
              key={need.id}
              accessibilityRole="button"
              style={screenStyles.card}
              onPress={() =>
                router.push({
                  pathname: '/student/needs/[id]',
                  params: { id: need.id },
                })
              }
            >
              <Text style={screenStyles.heading}>{need.projectName}</Text>
              <Text style={screenStyles.body}>
                {materialLabels[need.materialType]} · {need.widthMm} ×{' '}
                {need.heightMm} mm · {need.quantity} adet
              </Text>
              <Text style={screenStyles.body}>
                {need.region} · {need.neededBy}
              </Text>
            </Pressable>
          ))
        ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
});
