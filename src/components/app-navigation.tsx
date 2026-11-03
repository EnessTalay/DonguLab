import { Pressable, Text, View } from 'react-native';
import { router, usePathname, type Href } from 'expo-router';
import { useSession } from '@/services/session';
import { colors } from '@/theme/tokens';
import { styles } from '@/theme/screen-styles';

export function AppNavigation() {
  const { session } = useSession();
  const pathname = usePathname();
  const student = session?.profile.role === 'student';
  const navigation: { label: string; href: Href; active: boolean }[] = [
    { label: 'Genel bakış', href: '/', active: pathname === '/' },
    {
      label: student ? 'İhtiyaçlarım' : 'İşletmem',
      href: student ? '/student' : '/business',
      active: student
        ? pathname.startsWith('/student') && pathname !== '/student/requests'
        : pathname.startsWith('/business'),
    },
    ...(student
      ? [
          {
            label: 'Taleplerim',
            href: '/student/requests' as Href,
            active: pathname === '/student/requests',
          },
        ]
      : []),
  ];
  return session ? (
    <View style={styles.nav}>
      {navigation.map((item) => (
        <Pressable
          key={item.label}
          accessibilityRole="button"
          accessibilityState={{ selected: item.active }}
          onPress={() => {
            if (pathname !== item.href) router.navigate(item.href);
          }}
          style={[styles.navItem, item.active && styles.navActive]}
        >
          <Text
            style={[styles.navText, item.active && { color: colors.primary }]}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  ) : null;
}
