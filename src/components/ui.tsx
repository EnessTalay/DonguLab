import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/tokens';

export function ActionButton({ title, onPress, disabled, color, secondary = false }: {
  title: string; onPress: () => void; disabled?: boolean; color?: string; secondary?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled}
    onPress={onPress} style={({ pressed }) => [ui.button, { backgroundColor: secondary ? colors.soft : (color ?? colors.primary) }, (pressed || disabled) && { opacity: 0.55 }]}>
    <Text style={[ui.buttonLabel, secondary && { color: colors.ink }]}>{title}</Text>
  </Pressable>;
}

export function Metrics({ items }: { items: { label: string; value: number }[] }) {
  return <View style={ui.metrics}>{items.map(item => <View key={item.label} style={ui.metric}>
    <Text style={ui.value}>{item.value}</Text><Text style={ui.label}>{item.label}</Text>
  </View>)}</View>;
}

export function Feedback({ loading, error, retry }: { loading?: boolean; error?: string; retry?: () => void }) {
  if (loading) return <View style={ui.feedback}><ActivityIndicator color={colors.primary} /><Text style={ui.label}>Bilgiler yükleniyor…</Text></View>;
  if (!error) return null;
  return <View style={ui.feedback}><Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>
    {retry && <ActionButton title="Yeniden dene" onPress={retry} secondary />}</View>;
}

const ui = StyleSheet.create({
  button: { minHeight: 50, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonLabel: { color: 'white', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { flex: 1, minWidth: 90, padding: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, gap: 5 },
  value: { color: colors.ink, fontSize: 28, fontWeight: '700' },
  label: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  feedback: { padding: 20, gap: 12, borderRadius: 16, backgroundColor: colors.surface },
});
