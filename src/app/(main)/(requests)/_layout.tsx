import { Stack } from 'expo-router';
import { colors } from '@/theme/tokens';
import { BackButton } from '@/components/back-button';

export default function RequestsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.canvas },
        headerTintColor: colors.heading,
        contentStyle: { backgroundColor: colors.canvas },
        headerLeft: () => <BackButton fallback="/student/requests" />,
      }}
    >
      <Stack.Screen
        name="student/requests"
        options={{
          title: 'Taleplerim',
          headerBackVisible: false,
          headerLeft: () => null,
        }}
      />
      <Stack.Screen
        name="student/requests/[id]"
        options={{
          title: 'Talep detayı',
        }}
      />
    </Stack>
  );
}
