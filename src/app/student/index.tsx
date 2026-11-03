import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feedback, Metrics } from '@/components/ui';
import { Link, router, useFocusEffect } from 'expo-router';
import { Screen, styles as screenStyles } from '@/components/screen';
import { studentService } from '@/features/student/service';
import type { Need } from '@/types/domain';

export default function StudentScreen() {
  const [needs, setNeeds] = useState<readonly Need[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [revision, setRevision] = useState(0);
  const normalize = (value: string) => value.toLocaleLowerCase('tr-TR').trim();
  const visibleNeeds = needs.filter(need => normalize(`${need.projectName} ${need.region}`).includes(normalize(query)));

  useFocusEffect(useCallback(() => {
    void revision; // Explicit retry invalidates the focused screen's snapshot.
    let active = true;
    setLoading(true); setError('');

    const load = async () => {
      const items = await studentService.listMyNeeds();
      if (active) {
        setNeeds(items);
      }
    };

    void load().catch(error => {
      if (active) setError(error instanceof Error ? error.message : 'İhtiyaçlar yüklenemedi.');
    }).finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
    };
  }, [revision]));

  return (
    <Screen title="İhtiyaçlarım">
      <Text style={screenStyles.body}>Projelerin için doğru malzemeyi bul. İhtiyaçlarını tek yerden takip et.</Text>
      {!loading && !error && <Metrics items={[{ label: 'İhtiyaç kaydı', value: needs.length }, { label: 'Toplam malzeme adedi', value: needs.reduce((total, need) => total + need.quantity, 0) }]} />}

      <View style={styles.toolbar}>
        <Link href="/student/new-need" asChild>
          <Pressable accessibilityRole="button" style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Yeni ihtiyaç</Text>
          </Pressable>
        </Link>

        <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => router.push('/student/requests')}>
          <Text style={styles.secondaryButtonText}>Taleplerim</Text>
        </Pressable>
      </View>

      <TextInput accessibilityLabel="İhtiyaçlarda ara" placeholder="Proje adı veya bölge ara…" value={query} onChangeText={setQuery}
        style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#dde4db', borderRadius: 14, padding: 16, fontSize: 16, color: '#183c32' }} />
      <Feedback loading={loading} error={error} retry={() => setRevision(value => value + 1)} />
      {!loading && !error && (visibleNeeds.length === 0 ? (
        <View style={screenStyles.card}>
          <Text style={screenStyles.heading}>{query ? 'Aramana uygun ihtiyaç yok' : 'İlk projenle başlayalım'}</Text>
          <Text style={screenStyles.body}>{query ? 'Başka bir proje adı veya bölge deneyebilirsin.' : 'Yeni ihtiyaç düğmesinden ölçüleri girerek uygun malzemeleri bulabilirsin.'}</Text>
        </View>
      ) : (
        visibleNeeds.map((need) => (
          <Pressable
            key={need.id}
            accessibilityRole="button"
            style={screenStyles.card}
            onPress={() => router.push({ pathname: '/student/needs/[id]', params: { id: need.id } })}
          >
            <Text style={screenStyles.heading}>{need.projectName}</Text>
            <Text style={screenStyles.body}>{need.materialType === 'wood' ? 'Ahşap' : need.materialType === 'metal' ? 'Metal' : 'Plastik'} · {need.widthMm} × {need.heightMm} mm · {need.quantity} adet</Text>
            <Text style={screenStyles.body}>{need.region} · {need.neededBy}</Text>
          </Pressable>
        ))
      ))}
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
