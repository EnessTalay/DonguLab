import { colors } from '@/theme/tokens';
import { BackButton } from '@/components/back-button';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { Feedback } from '@/components/ui';
import { SessionProvider, useSession } from '@/services/session';

export const unstable_settings = { initialRouteName: '(main)' };

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
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          padding: 20,
          backgroundColor: colors.background,
        }}
      >
        <Feedback loading loadingLabel="Oturum yükleniyor…" />
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
        <Stack.Screen name="(main)" options={{ headerShown: false }} />
        <Stack.Screen
          name="+not-found"
          options={{
            title: 'Sayfa bulunamadı',
            headerLeft: () => <BackButton fallback="/" />,
          }}
        />
        <Stack.Protected guard={!session}>
          <Stack.Screen
            name="sign-in"
            options={{
              title: 'Giriş',
              headerLeft: () => <BackButton fallback="/" />,
            }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!!session && __DEV__}>
          <Stack.Screen
            name="workbench"
            options={{
              title: 'Geliştirici araçları',
              headerLeft: () => <BackButton fallback="/" />,
            }}
          />
        </Stack.Protected>
      </Stack>
    </>
  );
}
