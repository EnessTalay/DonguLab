import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import type { Ref } from 'react';
import { colors } from '@/theme/tokens';

export type InputFieldProps = TextInputProps & {
  label: string;
  optional?: boolean;
  error?: string;
  inputRef?: Ref<TextInput>;
};

export function InputField({
  label,
  optional = false,
  error,
  inputRef,
  style,
  ...inputProps
}: InputFieldProps) {
  return (
    <View style={local.field}>
      <Text style={local.label}>
        {label}
        {optional ? ' (isteğe bağlı)' : ''}
      </Text>
      <TextInput
        ref={inputRef}
        accessibilityLabel={label}
        {...inputProps}
        style={[local.input, style]}
      />
      {error && (
        <Text accessibilityRole="alert" style={local.fieldError}>
          {error}
        </Text>
      )}
    </View>
  );
}

const local = StyleSheet.create({
  field: { gap: 7 },
  label: { color: colors.heading, fontSize: 15, fontWeight: '600' },
  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.surface,
    color: colors.inputText,
    fontSize: 16,
  },
  fieldError: { color: colors.error, fontSize: 13, lineHeight: 19 },
});
