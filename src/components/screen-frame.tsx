import type { PropsWithChildren, ReactNode } from 'react';
import {
  Platform,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '@/theme/screen-styles';

export function ScreenFrame({
  title,
  children,
  footer,
  bottomInset = true,
}: PropsWithChildren<{
  title: string;
  footer?: ReactNode;
  bottomInset?: boolean;
}>) {
  const compact = useWindowDimensions().width < 360;
  return (
    <SafeAreaView
      style={styles.safe}
      edges={bottomInset ? ['bottom', 'left', 'right'] : ['left', 'right']}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        contentContainerStyle={[
          styles.scroll,
          compact && { paddingHorizontal: 16 },
        ]}
      >
        <View style={styles.content}>
          <View style={styles.masthead}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>d.</Text>
            </View>
            <Text style={styles.brand}>DÖNGÜLAB</Text>
            <Text style={styles.tagline}>Birlikte döngüye.</Text>
          </View>
          <Text
            accessibilityRole="header"
            style={[styles.title, compact && { fontSize: 28 }]}
          >
            {title}
          </Text>
          {children}
        </View>
      </ScrollView>
      {footer}
    </SafeAreaView>
  );
}
