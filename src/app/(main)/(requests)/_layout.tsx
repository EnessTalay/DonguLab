import { Stack } from 'expo-router';
import { colors } from '@/theme/tokens';

export default function RequestsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.canvas },
        headerTintColor: colors.heading,
        contentStyle: { backgroundColor: colors.canvas },
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
    </Stack>
  );
}
