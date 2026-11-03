import type { PropsWithChildren } from 'react';
import { ScreenFrame } from './screen-frame';
import { AppNavigation } from './app-navigation';

export { styles } from '@/theme/screen-styles';

export function Screen({
  title,
  children,
}: PropsWithChildren<{ title: string }>) {
  return (
    <ScreenFrame title={title} footer={<AppNavigation />}>
      {children}
    </ScreenFrame>
  );
}
