import { Text, View } from 'react-native';
import { Screen, styles } from '@/components/screen';
import { demoListings } from '@/services/demo';

export default function BusinessScreen() {
  return (
    <Screen title="Malzemelerin değer kazansın">
      <Text style={styles.note}>Örnek işletme görünümü. İlan oluşturma, talep onayı ve teslim işlemleri henüz geliştirilmedi.</Text>
      {demoListings.map(listing => (
        <View key={listing.id} style={styles.card}>
          <Text style={styles.heading}>{listing.title}</Text>
          <Text style={styles.body}>Toplam: {listing.quantityOnHand} · Ayrılmış: {listing.quantityReserved} · Kullanılabilir: {listing.quantityOnHand - listing.quantityReserved}</Text>
          <Text style={styles.body}>Son teslim: {listing.pickupDeadline}</Text>
        </View>
      ))}
    </Screen>
  );
}
