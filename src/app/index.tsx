import { Link } from 'expo-router';
import { useState } from 'react';
import { Button, Text, View } from 'react-native';
import { Screen, styles } from '@/components/screen';
import { services } from '@/services';
import { useSession } from '@/services/session';

export default function HomeScreen() {
  const { session, error, refresh } = useSession();
  const [signOutError, setSignOutError] = useState('');
  return (
    <Screen title="Artık malzemeye yeni bir döngü.">
      <Text style={styles.body}>İşletmelerin kullanılabilir artık malzemelerini öğrencilerin projeleriyle buluşturuyoruz.</Text>
      <Text style={styles.note}>{services.mode === 'demo' ? 'Yerel demo modu · Veriler bellektedir; yeniden yüklemede silinir ve cihazlar arasında paylaşılmaz.' : 'Supabase modu · Veri ve yetki kontrolleri sunucuda yapılır.'}</Text>
      {!!error && <Text accessibilityRole="alert" style={styles.note}>{error}</Text>}
      {!!signOutError && <Text accessibilityRole="alert" style={styles.note}>{signOutError}</Text>}
      {!session && <Link href="/sign-in" style={styles.link}>Hesabına giriş yap →</Link>}
      {session && <>
        <Text style={styles.body}>{session.profile.displayName} · {session.profile.role === 'student' ? 'Öğrenci' : 'İşletme'}</Text>
        <Link href="/workbench" style={styles.link}>Altyapı test ekranını aç →</Link>
        <Text style={styles.body}>Ekip ekranları henüz başlangıç örneklerini gösterir. Gerçek servis akışı altyapı test ekranında denenebilir.</Text>
        <Button title="Çıkış yap" onPress={() => { setSignOutError(''); void services.signOut().then(refresh).catch(() => setSignOutError('Çıkış yapılamadı. Yeniden deneyin.')); }} color="#16493e" />
      </>}
      {session?.profile.role === 'student' && <View style={styles.card}>
        <Text style={styles.heading}>Projen için malzeme bul</Text>
        <Text style={styles.body}>Örnek öğrenci ihtiyacını ve malzeme ilanlarını incele.</Text>
        <Link href="/student" style={styles.link}>Öğrenci ekranını aç →</Link>
      </View>}
      {session?.profile.role === 'business' && <View style={styles.card}>
        <Text style={styles.heading}>Malzemeni döngüye kat</Text>
        <Text style={styles.body}>İşletme ilan listesini ve kullanılabilir stokları incele.</Text>
        <Link href="/business" style={styles.link}>İşletme ekranını aç →</Link>
      </View>}
    </Screen>
  );
}
