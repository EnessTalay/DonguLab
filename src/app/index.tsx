import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { Screen, styles } from '@/components/screen';

export default function HomeScreen() {
  return (
    <Screen title="Artık malzemeye yeni bir döngü.">
      <Text style={styles.body}>İşletmelerin kullanılabilir artık malzemelerini öğrencilerin projeleriyle buluşturuyoruz.</Text>
      <Text style={styles.note}>Geliştirme başlangıcı · Bu ekranlar örnek veri kullanır. Rol seçimi giriş veya yetkilendirme değildir; veriler cihazlar arasında paylaşılmaz.</Text>
      <View style={styles.card}>
        <Text style={styles.heading}>Projen için malzeme bul</Text>
        <Text style={styles.body}>Örnek öğrenci ihtiyacını ve malzeme ilanlarını incele.</Text>
        <Link href="/student" style={styles.link}>Öğrenci ekranını aç →</Link>
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Malzemeni döngüye kat</Text>
        <Text style={styles.body}>İşletme ilan listesini ve kullanılabilir stokları incele.</Text>
        <Link href="/business" style={styles.link}>İşletme ekranını aç →</Link>
      </View>
    </Screen>
  );
}
