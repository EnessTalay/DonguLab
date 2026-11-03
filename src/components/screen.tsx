import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function Screen({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <Text style={styles.brand}>DÖNGÜLAB / BAŞLANGIÇ</Text>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f2f6f1' },
  scroll: { padding: 24, flexGrow: 1 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', gap: 18 },
  brand: { color: '#476957', fontSize: 12, letterSpacing: 2, fontWeight: '700' },
  title: { color: '#16493e', fontSize: 32, fontWeight: '700' },
  body: { color: '#3d5148', fontSize: 16, lineHeight: 25 },
  card: { padding: 22, borderRadius: 18, backgroundColor: '#fff', gap: 10, borderWidth: 1, borderColor: '#dbe5da' },
  heading: { color: '#16493e', fontSize: 20, fontWeight: '600' },
  link: { color: '#16493e', fontSize: 18, fontWeight: '700', paddingVertical: 10 },
  note: { color: '#6b582e', backgroundColor: '#fff3d7', padding: 16, borderRadius: 12, fontSize: 14, lineHeight: 22 },
});
