import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Screen, styles as screenStyles } from '@/components/screen';
import { studentDemoService } from '@/features/student/service';
import type { Need } from '@/types/domain';

export default function StudentScreen() {
  const [needs, setNeeds] = useState<readonly Need[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const items = await studentDemoService.listMyNeeds();
      if (active) {
        setNeeds(items);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <Screen title="İhtiyaçlarım">
      <Text style={screenStyles.note}>Örnek mod: bu ekran verileri geçici servisle gösterir; gerçek veri tabanı ve otomatik eşleşme beklenmektedir.</Text>

      <View style={styles.toolbar}>
        <Link href="/student/new-need" asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Yeni ihtiyaç</Text>
          </Pressable>
        </Link>

        <Pressable style={styles.secondaryButton} onPress={() => router.push('/student/requests')}>
          <Text style={styles.secondaryButtonText}>Taleplerim</Text>
        </Pressable>
      </View>

      {needs.length === 0 ? (
        <View style={screenStyles.card}>
          <Text style={screenStyles.heading}>Henüz ihtiyaç kaydı yok</Text>
          <Text style={screenStyles.body}>İlk ihtiyacını oluşturarak uygun ilanları görebilirsin.</Text>
        </View>
      ) : (
        needs.map((need) => (
          <Pressable
            key={need.id}
            style={screenStyles.card}
            onPress={() => router.push({ pathname: '/student/needs/[id]', params: { id: need.id } })}
          >
            <Text style={screenStyles.heading}>{need.projectName}</Text>
            <Text style={screenStyles.body}>{need.materialType === 'wood' ? 'Ahşap' : need.materialType === 'metal' ? 'Metal' : 'Plastik'} · {need.widthMm} × {need.heightMm} mm · {need.quantity} adet</Text>
            <Text style={screenStyles.body}>{need.region} · {need.neededBy}</Text>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  primaryButton: {
    backgroundColor: '#16493e',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: '#eef3ef',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe5da',
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: '#16493e',
    fontWeight: '700',
    fontSize: 15,
  },
});

