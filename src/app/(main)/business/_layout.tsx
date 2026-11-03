import { Stack } from 'expo-router';
import { colors } from '@/theme/tokens';
import { BackButton } from '@/components/back-button';

export default function BusinessLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.canvas },
        headerTintColor: colors.heading,
        contentStyle: { backgroundColor: colors.canvas },
        headerLeft: () => <BackButton fallback="/business" />,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="listings/[id]" options={{ title: 'İlan detayı' }} />
      <Stack.Screen
        name="requests/[listingId]"
        options={{ title: 'İlana gelen talepler' }}
      />
      <Stack.Screen
        name="requests/detail/[id]"
        options={{ title: 'Talep detayı' }}
      />
    </Stack>
  );
}
