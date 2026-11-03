import { colors } from '@/theme/tokens';
import { Stack } from 'expo-router';

export default function StudentLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.canvas },
        headerTintColor: colors.heading,
        contentStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Öğrenci' }} />
      <Stack.Screen name="new-need" options={{ title: 'İhtiyaç formu' }} />
      <Stack.Screen name="needs/[id]" options={{ title: 'İhtiyaç detayı' }} />
      <Stack.Screen
        name="matches/[needId]"
        options={{ title: 'Uygun ilanlar' }}
      />
      <Stack.Screen name="requests" options={{ title: 'Taleplerim' }} />
    </Stack>
  );
}
