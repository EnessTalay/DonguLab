import { colors } from '@/theme/tokens';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SessionProvider, useSession } from '@/services/session';

export default function RootLayout() {
  return (
    <SessionProvider>
      <Navigation />
    </SessionProvider>
  );
}

function Navigation() {
  const { session, loading } = useSession();
  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator accessibilityLabel="Oturum yükleniyor" />
      </View>
    );
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.canvas },
          headerTintColor: colors.heading,
          contentStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: 'DöngüLab', headerBackVisible: false }}
        />
        <Stack.Protected guard={!session}>
          <Stack.Screen name="sign-in" options={{ title: 'Giriş' }} />
        </Stack.Protected>
        <Stack.Protected guard={session?.profile.role === 'student'}>
          <Stack.Screen
            name="student"
            options={{ headerShown: false, title: 'Öğrenci' }}
          />
        </Stack.Protected>
        <Stack.Protected guard={session?.profile.role === 'business'}>
          <Stack.Screen name="business/index" options={{ title: 'İşletme' }} />
        </Stack.Protected>
        <Stack.Protected guard={!!session && __DEV__}>
          <Stack.Screen
            name="workbench"
            options={{ title: 'Altyapı test ekranı' }}
          />
        </Stack.Protected>
      </Stack>
    </>
  );
}
