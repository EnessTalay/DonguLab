import type { PropsWithChildren } from 'react';
import { useSegments } from 'expo-router';
import { useSession } from '@/services/session';
import { ScreenFrame } from './screen-frame';

export { styles } from '@/theme/screen-styles';

export function Screen({
  title,
  children,
}: PropsWithChildren<{ title: string }>) {
  const segments: readonly string[] = useSegments();
  const { session } = useSession();
  const hasTabBar = segments[0] === '(main)' && !!session;
  return (
    <ScreenFrame title={title} bottomInset={!hasTabBar}>
      {children}
    </ScreenFrame>
  );
}
