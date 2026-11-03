import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { ActionButton as Button, Metrics, Feedback } from '@/components/ui';
import { Screen, styles } from '@/components/screen';
import { services } from '@/services';
import { useSession } from '@/services/session';

export default function HomeScreen() {
  const { session, error, refresh } = useSession();
  const [signOutError, setSignOutError] = useState('');
  const [busy, setBusy] = useState(false);
  const [metrics, setMetrics] = useState<{ label: string; value: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    void revision; // Explicit retry invalidates the focused screen's snapshot.
    let active = true;
    if (!session) return;
    setLoading(true); setDataError('');
    const student = session.profile.role === 'student';
    void Promise.all([
      student ? services.listMyNeeds() : services.listMyListings(),
      student ? services.listMyRequests() : services.listIncomingRequests(),
    ]).then(([records, requests]) => {
      if (active) setMetrics([
        { label: student ? 'İhtiyaç kaydı' : 'Malzeme ilanı', value: records.length },
        { label: 'Bekleyen talep', value: requests.filter(item => item.request.status === 'pending').length },
        { label: 'Teslim bekliyor', value: requests.filter(item => item.request.status === 'approved').length },
      ]);
    }).catch(() => { if (active) setDataError('Güncel bilgiler alınamadı. Yeniden deneyin.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session, revision]));
  return (
    <Screen title={session ? 'Bugün döngüde neler var?' : 'Artık malzeme. Yeni ihtimaller.'}>
      <Text style={styles.body}>İşletmelerin kullanılabilir artık malzemelerini öğrencilerin projeleriyle buluşturuyoruz.</Text>
      {services.mode === 'demo' && <Text style={styles.note}>Yerel demo modu · Veriler yeniden yüklemede silinir.</Text>}
      {!!error && <Text accessibilityRole="alert" style={styles.note}>{error}</Text>}
      {!!signOutError && <Text accessibilityRole="alert" style={styles.note}>{signOutError}</Text>}
      {!session && <>
        <View style={styles.card}>
          <Text style={styles.heading}>Projen için ihtiyacın olan malzemeyi bul</Text>
          <Text style={styles.body}>Ölçülerini gir, uygun ilanları incele ve işletmeye talep gönder. Onaylanan malzemeni teslim kodunla al.</Text>
        </View>
        <Link href="/sign-in" style={styles.link}>Giriş yap veya hesap oluştur →</Link>
        <Text style={styles.body}>İşletmeler için hesap açılışı ekip onayına tabidir.</Text>
      </>}
      {session && <>
        <View style={[styles.card, { backgroundColor: '#215b46', borderColor: '#215b46' }]}>
          <Text style={{ color: '#d9ecaa', fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>{session.profile.role === 'student' ? 'ÖĞRENCİ ALANI' : 'İŞLETME ALANI'}</Text>
          <Text style={[styles.heading, { color: 'white' }]}>{session.profile.displayName}</Text>
          <Text style={{ color: '#e0eadd', lineHeight: 23 }}>Küçük bir adım, yeni bir döngü. {session.profile.role === 'student' ? 'Bir sonraki projenin malzemesini birlikte bulalım.' : 'Atölyendeki malzemeyi yeni projelere kazandıralım.'}</Text>
        </View>
        <Feedback loading={loading} error={dataError} retry={() => setRevision(value => value + 1)} />
        {!loading && !dataError && <Metrics items={metrics} />}
      </>}
      {session?.profile.role === 'student' && <View style={styles.card}>
        <Text style={styles.heading}>Projen için malzeme bul</Text>
        <Text style={styles.body}>İhtiyacını kaydet, uygun malzemeleri bul ve taleplerini takip et.</Text>
        <Button title="İhtiyaçlarımı yönet →" onPress={() => router.navigate('/student')} />
        <Button title="Yeni ihtiyaç oluştur" secondary onPress={() => router.push('/student/new-need')} />
      </View>}
      {session?.profile.role === 'business' && <View style={styles.card}>
        <Text style={styles.heading}>Malzemeni döngüye kat</Text>
        <Text style={styles.body}>İşletme ilan listesini ve kullanılabilir stokları incele.</Text>
        <Button title="İlanları ve talepleri yönet →" onPress={() => router.navigate('/business')} />
      </View>}
      <View style={styles.card}>
        <Text style={styles.heading}>Döngü nasıl işler?</Text>
        {[
          ['01', 'İhtiyacını tanımla', 'Malzeme, ölçü ve bölge bilgilerinle uygun ilanları bul.'],
          ['02', 'Talebini ilet', 'İşletme onayladığında malzeme senin için ayrılır.'],
          ['03', 'Kodunla teslim al', 'Teslim kodu doğrulandığında işlem tamamlanır.'],
        ].map(([number, title, description]) => <View key={number} style={{ flexDirection: 'row', gap: 14, paddingVertical: 10 }}>
          <Text style={{ color: '#215b46', fontWeight: '800', fontSize: 20 }}>{number}</Text>
          <View style={{ flex: 1, gap: 4 }}><Text style={{ color: '#183c32', fontWeight: '700' }}>{title}</Text><Text style={styles.body}>{description}</Text></View>
        </View>)}
      </View>
      {session && <>
        {__DEV__ && <Link href="/workbench" style={styles.link}>Geliştirici araçları →</Link>}
        <Button title={busy ? 'Çıkış yapılıyor…' : 'Hesaptan çıkış yap'} secondary disabled={busy} onPress={() => {
          if (busy) return;
          setBusy(true); setSignOutError('');
          void services.signOut().then(refresh).catch(() => setSignOutError('Çıkış yapılamadı. Yeniden deneyin.')).finally(() => setBusy(false));
        }} />
      </>}
    </Screen>
  );
}
