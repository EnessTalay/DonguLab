import { colors } from '@/theme/tokens';
import { materialLabels } from '@/lib/labels';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Feedback, Metrics } from '@/components/ui';
import { ChoiceChips } from '@/components/choice-chips';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, styles as screenStyles } from '@/components/screen';
import { studentService } from '@/features/student/service';
import {
  filterNeedsByStatus,
  getNeedListCounts,
  getNeedListEmptyState,
} from '@/features/student/need-list';
import type { NeedListFilter } from '@/features/student/need-list';
import { useFocusedResource } from '@/hooks/use-focused-resource';
import { StatePanel } from '@/components/state-panel';

export default function StudentScreen() {
  const { archived } = useLocalSearchParams<{ archived?: string }>();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<NeedListFilter>('active');
  const { data, loading, error, reload } = useFocusedResource(
    useCallback(() => studentService.listMyNeeds(), []),
  );
  const needs = data ?? [];
  const counts = getNeedListCounts(needs);
  const filteredNeeds = filterNeedsByStatus(needs, filter);
  const normalize = (value: string) => value.toLocaleLowerCase('tr-TR').trim();
  const hasQuery = normalize(query).length > 0;
  const visibleNeeds = filteredNeeds.filter((need) =>
    normalize(`${need.projectName} ${need.region}`).includes(normalize(query)),
  );
  const emptyState = getNeedListEmptyState(
    filter,
    counts.total,
    hasQuery,
  );

  return (
    <Screen title="İhtiyaçlarım">
      <Text style={screenStyles.body}>
        Projelerin için doğru malzemeyi bul. İhtiyaçlarını tek yerden takip et.
      </Text>
      {!loading && !error && (
        <Metrics
          items={[
            { label: 'Aktif ihtiyaç', value: counts.active },
            { label: 'Aktif malzeme adedi', value: counts.activeQuantity },
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

      {archived === '1' && (
        <StatePanel
          kind="success"
          title="İhtiyaç arşivlendi"
          message="İhtiyaç geçmiş kayıtlarıyla birlikte saklandı."
          action={{
            label: 'Tamam',
            onPress: () => router.setParams({ archived: undefined }),
          }}
        />
      )}

      <ChoiceChips
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'active', label: `Aktif (${counts.active})` },
          { value: 'archived', label: `Geçmiş (${counts.archived})` },
          { value: 'all', label: `Tümü (${counts.total})` },
        ]}
      />

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
            title={emptyState.title}
            message={emptyState.message}
            action={{
              label:
                emptyState.action === 'clear-search'
                  ? 'Aramayı temizle'
                  : emptyState.action === 'show-active'
                    ? 'Aktif ihtiyaçları gör'
                    : emptyState.action === 'show-archived'
                      ? 'Geçmiş ihtiyaçları gör'
                      : 'Yeni ihtiyaç oluştur',
              onPress: () => {
                if (emptyState.action === 'clear-search') setQuery('');
                else if (emptyState.action === 'show-active')
                  setFilter('active');
                else if (emptyState.action === 'show-archived')
                  setFilter('archived');
                else router.push('/student/new-need');
              },
            }}
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
              {need.status === 'archived' && (
                <Text style={screenStyles.note}>Arşivlendi · salt okunur</Text>
              )}
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
