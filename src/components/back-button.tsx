import { Pressable, Text } from 'react-native';
import { router, type Href } from 'expo-router';
import { colors } from '@/theme/tokens';

export function BackButton({ fallback }: { fallback: Href }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Geri dön"
      hitSlop={8}
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace(fallback);
      }}
      style={{
        minWidth: 44,
        minHeight: 44,
        justifyContent: 'center',
        paddingRight: 12,
      }}
    >
      <Text style={{ color: colors.heading, fontSize: 24 }}>‹</Text>
    </Pressable>
  );
}
