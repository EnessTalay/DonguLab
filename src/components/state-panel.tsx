import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ActionButton } from './action-button';
import { colors } from '@/theme/tokens';

type PanelAction = { label: string; onPress: () => void };
export function StatePanel({
  kind,
  title,
  message,
  action,
  secondaryAction,
}: {
  kind: 'loading' | 'empty' | 'error' | 'not-found' | 'success';
  title: string;
  message?: string;
  action?: PanelAction;
  secondaryAction?: PanelAction;
}) {
  return (
    <View
      style={panel.container}
      accessibilityLiveRegion="polite"
      accessibilityState={{ busy: kind === 'loading' }}
    >
      {kind === 'loading' && (
        <ActivityIndicator accessibilityLabel={title} color={colors.primary} />
      )}
      <Text accessibilityRole="header" style={panel.title}>
        {title}
      </Text>
      {!!message && (
        <Text
          accessibilityRole={kind === 'error' ? 'alert' : undefined}
          style={[panel.message, kind === 'error' && { color: colors.danger }]}
        >
          {message}
        </Text>
      )}
      {action && <ActionButton title={action.label} onPress={action.onPress} />}
      {secondaryAction && (
        <ActionButton
          title={secondaryAction.label}
          onPress={secondaryAction.onPress}
          secondary
        />
      )}
    </View>
  );
}

const panel = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 20,
    gap: 12,
  },
  title: { color: colors.ink, fontSize: 18, fontWeight: '700', lineHeight: 25 },
  message: { color: colors.muted, fontSize: 15, lineHeight: 23 },
});
