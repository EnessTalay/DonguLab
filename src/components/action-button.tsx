import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colors } from '@/theme/tokens';

export function ActionButton({
  title,
  onPress,
  disabled,
  color,
  secondary = false,
  loading = false,
  style,
  textStyle,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  secondary?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        ui.button,
        {
          backgroundColor: secondary ? colors.soft : (color ?? colors.primary),
        },
        style,
        (pressed || disabled || loading) && { opacity: 0.55 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.ink : colors.surface} />
      ) : (
        <Text
          style={[
            ui.buttonLabel,
            secondary && { color: colors.ink },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const ui = StyleSheet.create({
  button: {
    minHeight: 50,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
