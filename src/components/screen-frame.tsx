import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '@/theme/screen-styles';

export function ScreenFrame({
  title,
  children,
  footer,
}: PropsWithChildren<{ title: string; footer?: ReactNode }>) {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.content}>
          <View style={styles.masthead}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>d.</Text>
            </View>
            <Text style={styles.brand}>DÖNGÜLAB</Text>
            <Text style={styles.tagline}>Birlikte döngüye.</Text>
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {children}
        </View>
      </ScrollView>
      {footer}
    </SafeAreaView>
  );
}
