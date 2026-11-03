import { BottomTabBar, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useSession } from '@/services/session';

// Use the navigator's actual tab state, safe area, keyboard visibility and tabPress events.
export function AppNavigation(props: BottomTabBarProps) {
  const { session } = useSession();
  return session ? <BottomTabBar {...props} /> : null;
}
