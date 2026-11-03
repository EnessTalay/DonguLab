import { Pressable, Text, View } from 'react-native';
import { colors } from '@/theme/tokens';

export function ChoiceChips<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="button"
          accessibilityState={{ selected: value === option.value, disabled }}
          disabled={disabled}
          onPress={() => onChange(option.value)}
          style={{
            minHeight: 44,
            justifyContent: 'center',
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor:
              value === option.value ? colors.primary : colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <Text
            style={{
              color: value === option.value ? 'white' : colors.ink,
              fontWeight: '600',
            }}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
