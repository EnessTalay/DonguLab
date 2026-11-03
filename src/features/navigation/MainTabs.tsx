import { Tabs } from 'expo-router/js-tabs';
import { Text } from 'react-native';
import { AppNavigation } from '@/components/app-navigation';
import { useSession } from '@/services/session';
import { colors } from '@/theme/tokens';

export default function MainTabs() {
  const { session } = useSession();
  return (
    <Tabs
      initialRouteName="index"
      backBehavior="initialRoute"
      tabBar={(props) => <AppNavigation {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.canvas },
        headerTintColor: colors.heading,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarActiveBackgroundColor: colors.soft,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarItemStyle: { minHeight: 52 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'DöngüLab',
          tabBarLabel: 'Genel bakış',
          tabBarAccessibilityLabel: 'Genel bakış',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>◉</Text>
          ),
        }}
      />
      <Tabs.Protected guard={session?.profile.role === 'student'}>
        <Tabs.Screen
          name="(needs)"
          options={{
            title: 'İhtiyaçlarım',
            tabBarAccessibilityLabel: 'İhtiyaçlarım',
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 20 }}>▤</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="(requests)"
          options={{
            title: 'Taleplerim',
            tabBarAccessibilityLabel: 'Taleplerim',
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 20 }}>⇄</Text>
            ),
          }}
        />
      </Tabs.Protected>
      <Tabs.Protected guard={session?.profile.role === 'business'}>
        <Tabs.Screen
          name="business/index"
          options={{
            title: 'İşletmem',
            tabBarAccessibilityLabel: 'İşletmem',
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 20 }}>▤</Text>
            ),
          }}
        />
      </Tabs.Protected>
    </Tabs>
  );
}
