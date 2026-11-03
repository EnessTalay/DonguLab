import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: '#f2f6f1' }, headerTintColor: '#16493e', contentStyle: { backgroundColor: '#f2f6f1' } }}>
        <Stack.Screen name="index" options={{ title: 'DöngüLab' }} />
        <Stack.Screen name="student/index" options={{ title: 'Öğrenci' }} />
        <Stack.Screen name="business/index" options={{ title: 'İşletme' }} />
      </Stack>
    </>
  );
}
