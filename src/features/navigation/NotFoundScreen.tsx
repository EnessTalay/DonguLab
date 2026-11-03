import { router } from 'expo-router';
import { Screen } from '@/components/screen';
import { StatePanel } from '@/components/state-panel';

export default function NotFoundScreen() {
  return (
    <Screen title="Sayfa bulunamadı">
      <StatePanel
        kind="not-found"
        title="Bu bağlantı artık geçerli değil"
        message="Adres değişmiş veya sayfa kaldırılmış olabilir. Genel bakıştan devam edebilirsin."
        action={{
          label: 'Genel bakışa dön',
          onPress: () => router.replace('/'),
        }}
      />
    </Screen>
  );
}
