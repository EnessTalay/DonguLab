import { StyleSheet, Text, View } from 'react-native';
import { StatePanel } from './state-panel';
import { colors } from '@/theme/tokens';
import type { ErrorCode } from '@/services/contracts';
export { ActionButton } from './action-button';

export function Metrics({
  items,
}: {
  items: { label: string; value: number }[];
}) {
  return (
    <View style={ui.metrics}>
      {items.map((item) => (
        <View key={item.label} style={ui.metric}>
          <Text style={ui.value}>{item.value}</Text>
          <Text style={ui.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function Feedback({
  loading,
  error,
  retry,
  errorCode,
  loadingLabel = 'Bilgiler yükleniyor…',
}: {
  loading?: boolean;
  error?: string;
  retry?: () => void;
  errorCode?: ErrorCode | null;
  loadingLabel?: string;
}) {
  if (loading)
    return (
      <StatePanel
        kind="loading"
        title={loadingLabel}
        message="Lütfen bekleyin."
      />
    );
  if (!error) return null;
  const missing = errorCode === 'NOT_FOUND';
  return (
    <StatePanel
      kind={missing ? 'not-found' : 'error'}
      title={missing ? 'Kayıt bulunamadı' : 'İşlem tamamlanamadı'}
      message={error}
      action={retry ? { label: 'Yeniden dene', onPress: retry } : undefined}
    />
  );
}

const ui = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: {
    flex: 1,
    minWidth: 90,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    gap: 5,
  },
  value: { color: colors.ink, fontSize: 28, fontWeight: '700' },
  label: { color: colors.muted, fontSize: 13, lineHeight: 19 },
});
