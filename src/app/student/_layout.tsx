import { Stack } from 'expo-router';

export default function StudentLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#f2f6f1' },
        headerTintColor: '#16493e',
        contentStyle: { backgroundColor: '#f2f6f1' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Öğrenci' }} />
      <Stack.Screen name="new-need" options={{ title: 'İhtiyaç formu' }} />
      <Stack.Screen name="needs/[id]" options={{ title: 'İhtiyaç detayı' }} />
      <Stack.Screen name="matches/[needId]" options={{ title: 'Uygun ilanlar' }} />
      <Stack.Screen name="requests" options={{ title: 'Taleplerim' }} />
    </Stack>
  );
}
