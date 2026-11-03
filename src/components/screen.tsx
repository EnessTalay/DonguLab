import type { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, usePathname, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '@/services/session';
import { colors } from '@/theme/tokens';

export function Screen({ title, children }: PropsWithChildren<{ title: string }>) {
  const { session } = useSession();
  const pathname = usePathname();
  const student = session?.profile.role === 'student';
  const navigation: { label: string; href: Href; active: boolean }[] = [
    { label: 'Genel bakış', href: '/', active: pathname === '/' },
    { label: student ? 'İhtiyaçlarım' : 'İşletmem', href: student ? '/student' : '/business', active: student ? pathname.startsWith('/student') && pathname !== '/student/requests' : pathname.startsWith('/business') },
    ...(student ? [{ label: 'Taleplerim', href: '/student/requests' as Href, active: pathname === '/student/requests' }] : []),
  ];
  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <View style={styles.masthead}><View style={styles.logo}><Text style={styles.logoText}>d.</Text></View>
            <Text style={styles.brand}>DÖNGÜLAB</Text><Text style={styles.tagline}>Birlikte döngüye.</Text></View>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          {children}
        </View>
      </ScrollView>
      {session && <View style={styles.nav}>{navigation.map(item => <Pressable key={item.label}
        accessibilityRole="button" accessibilityState={{ selected: item.active }} onPress={() => { if (pathname !== item.href) router.navigate(item.href); }}
        style={[styles.navItem, item.active && styles.navActive]}>
        <Text style={[styles.navText, item.active && { color: colors.primary }]}>{item.label}</Text>
      </Pressable>)}</View>}
    </SafeAreaView>
  );
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 32, flexGrow: 1 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', gap: 20 },
  masthead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' },
  logo: { backgroundColor: colors.primary, width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: colors.accent, fontSize: 25, fontWeight: '800' },
  tagline: { color: colors.muted, fontSize: 11, marginLeft: 'auto' },
  nav: { flexDirection: 'row', gap: 6, padding: 10, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  navItem: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 13, paddingHorizontal: 5 },
  navActive: { backgroundColor: colors.soft },
  navText: { color: colors.muted, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  brand: { color: '#476957', fontSize: 12, letterSpacing: 2, fontWeight: '700' },
  title: { color: '#16493e', fontSize: 32, fontWeight: '700' },
  body: { color: '#3d5148', fontSize: 16, lineHeight: 25 },
  card: { padding: 22, borderRadius: 18, backgroundColor: '#fff', gap: 10, borderWidth: 1, borderColor: '#dbe5da' },
  heading: { color: '#16493e', fontSize: 20, fontWeight: '600' },
  link: { color: '#16493e', fontSize: 18, fontWeight: '700', paddingVertical: 10 },
  note: { color: '#6b582e', backgroundColor: '#fff3d7', padding: 16, borderRadius: 12, fontSize: 14, lineHeight: 22 },
});
