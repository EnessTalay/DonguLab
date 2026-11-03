import { Text, View } from 'react-native';
import { Screen, styles } from '@/components/screen';
import { demoListings, demoNeed } from '@/services/demo';

export default function StudentScreen() {
  return (
    <Screen title="Projene bir başlangıç">
      <View style={styles.card}>
        <Text style={styles.heading}>Örnek ihtiyaç: {demoNeed.projectName}</Text>
        <Text style={styles.body}>{demoNeed.widthMm} × {demoNeed.heightMm} mm · {demoNeed.thicknessMm} mm kalınlık · {demoNeed.quantity} adet ahşap · {demoNeed.region}</Text>
      </View>
      <Text style={styles.note}>Bunlar örnek ilanlardır. İhtiyaç formu, uygunluk motoru ve talep gönderme henüz geliştirilmedi.</Text>
      {demoListings.map(listing => (
        <View key={listing.id} style={styles.card}>
          <Text style={styles.heading}>{listing.title}</Text>
          <Text style={styles.body}>{listing.widthMm} × {listing.heightMm} mm · {listing.thicknessMm === null ? 'Kalınlık doğrulanmalı' : `${listing.thicknessMm} mm kalınlık`}</Text>
          <Text style={styles.body}>{listing.quantityOnHand - listing.quantityReserved} adet kullanılabilir · {listing.region}</Text>
        </View>
      ))}
    </Screen>
  );
}
