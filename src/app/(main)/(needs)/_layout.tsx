import { Stack } from 'expo-router';
import { BackButton } from '@/components/back-button';
import { colors } from '@/theme/tokens';

export const unstable_settings = { initialRouteName: 'student/index' };

export default function StudentLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.canvas },
        headerTintColor: colors.heading,
        contentStyle: { backgroundColor: colors.canvas },
        headerLeft: () => <BackButton fallback="/student" />,
      }}
    >
      <Stack.Screen
        name="student/index"
        options={{
          title: 'İhtiyaçlarım',
          headerLeft: () => null,
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="student/new-need"
        options={{ title: 'Yeni ihtiyaç' }}
      />
      <Stack.Screen
        name="student/needs/[id]"
        options={{ title: 'İhtiyaç detayı' }}
      />
      <Stack.Screen
        name="student/matches/[needId]"
        options={{ title: 'Uygun ilanlar' }}
      />
    </Stack>
  );
}
