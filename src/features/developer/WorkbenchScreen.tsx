import { colors } from '@/theme/tokens';
import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { Button, Text, TextInput, View } from 'react-native';
import { Screen, styles } from '@/components/screen';
import { AppError, services, type RequestView } from '@/services';
import { useSession } from '@/services/session';
import type { Listing, Need } from '@/types/domain';

// Enes's integration tool, not a replacement for the team's feature screens.
export default function WorkbenchScreen() {
  const { session } = useSession();
  const [listings, setListings] = useState<Listing[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [requests, setRequests] = useState<RequestView[]>([]);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const [code, setCode] = useState('');
  const [issued, setIssued] = useState<{
    requestId: string;
    code: string;
    expiresAt: string;
  } | null>(null);
  const isStudent = session?.profile.role === 'student';
  const actorId = session?.profile.id;

  async function reload() {
    if (!session) return;
    const [nextListings, nextNeeds, nextRequests] = await Promise.all([
      isStudent ? services.listListings() : services.listMyListings(),
      isStudent ? services.listMyNeeds() : Promise.resolve([]),
      isStudent ? services.listMyRequests() : services.listIncomingRequests(),
    ]);
    setListings(nextListings);
    setNeeds(nextNeeds);
    setRequests(nextRequests);
    setIssued((previous) =>
      previous &&
      nextRequests.some(
        (r) =>
          r.request.id === previous.requestId &&
          r.request.status === 'approved' &&
          r.expiresAt &&
          new Date(r.expiresAt) > new Date(),
      )
        ? previous
        : null,
    );
  }
  async function run(action: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await action();
      await reload();
      setMessage(success);
    } catch (e) {
      setMessage(
        e instanceof AppError
          ? `${e.code}: ${e.message}`
          : 'İşlem tamamlanamadı. Yeniden deneyin.',
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let live = true;
    if (!actorId) return;
    // The route remounts on sign-out; don't preserve a previous account's DTOs.
    void Promise.all([
      isStudent ? services.listListings() : services.listMyListings(),
      isStudent ? services.listMyNeeds() : Promise.resolve([]),
      isStudent ? services.listMyRequests() : services.listIncomingRequests(),
    ])
      .then(([ls, ns, rs]) => {
        if (live) {
          setListings(ls);
          setNeeds(ns);
          setRequests(rs);
        }
      })
      .catch((e) => {
        if (live)
          setMessage(
            e instanceof AppError ? e.message : 'Veriler yüklenemedi.',
          );
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [actorId, isStudent]);

  const futureDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 10);
  };
  return (
    <Screen title="Servis akışını dene">
      <Link href="/" style={styles.link}>
        Ana sayfaya dön
      </Link>
      <Text style={styles.note}>
        Geliştirici test ekranı ·{' '}
        {services.mode === 'demo'
          ? 'Yerel demo; veriler yeniden yüklenince silinir.'
          : 'Gerçek Supabase; aşağıdaki düğmeler sunucu kaydı oluşturur.'}{' '}
        Ürün işlemleri öğrenci ve işletme ekranlarında kullanılabilir. Burası
        geliştiriciler için servis doğrulama aracıdır.
      </Text>
      {!!message && (
        <Text accessibilityRole="alert" style={styles.note}>
          {message}
        </Text>
      )}
      <Button
        title={busy ? 'İşlem sürüyor…' : 'Verileri yenile'}
        disabled={busy}
        onPress={() => void run(reload, 'Listeler yenilendi.')}
      />
      {isStudent ? (
        <Button
          title="Örnek ihtiyaç oluştur (3 adet ahşap)"
          disabled={busy}
          onPress={() =>
            void run(
              () =>
                services.createNeed({
                  projectName: 'Altyapı test maketi',
                  materialType: 'wood',
                  widthMm: 300,
                  heightMm: 200,
                  thicknessMm: 6,
                  quantity: 3,
                  region: 'İstanbul',
                  neededBy: futureDate(),
                }),
              'İhtiyaç oluşturuldu.',
            )
          }
        />
      ) : (
        <Button
          title="Örnek ilan oluştur (12 adet ahşap)"
          disabled={busy}
          onPress={() =>
            void run(
              () =>
                services.createListing({
                  title: 'Altyapı test ahşabı',
                  description: '',
                  pickupInstructions: '',
                  materialType: 'wood',
                  widthMm: 600,
                  heightMm: 400,
                  thicknessMm: 6,
                  quantityOnHand: 12,
                  region: 'İstanbul',
                  pickupDeadline: futureDate(),
                }),
              'İlan oluşturuldu.',
            )
          }
        />
      )}
      <Text style={styles.heading}>İlanlar</Text>
      {!busy && !listings.length && (
        <Text style={styles.body}>
          Henüz ilan yok. İşletme hesabıyla bir örnek ilan oluşturun.
        </Text>
      )}
      {listings.map((listing) => (
        <View key={listing.id} style={styles.card}>
          <Text style={styles.heading}>{listing.title}</Text>
          <Text style={styles.body}>
            Toplam {listing.quantityOnHand} · Ayrılmış{' '}
            {listing.quantityReserved} · Kullanılabilir{' '}
            {listing.quantityOnHand - listing.quantityReserved}
          </Text>
          {isStudent &&
            needs.map((need) => (
              <Button
                key={need.id}
                title={`${need.projectName} için talep gönder`}
                disabled={busy}
                onPress={() =>
                  void run(
                    () => services.createRequest(need.id, listing.id),
                    'Talep oluşturuldu veya mevcut talep getirildi.',
                  )
                }
              />
            ))}
        </View>
      ))}
      <Text style={styles.heading}>
        {isStudent ? 'Taleplerim' : 'Gelen talepler'}
      </Text>
      {!requests.length && <Text style={styles.body}>Talep bulunmuyor.</Text>}
      {requests.map((view) => (
        <View key={view.request.id} style={styles.card}>
          <Text style={styles.heading}>{view.listingTitle}</Text>
          <Text style={styles.body}>
            {view.projectName} · {view.request.quantity} adet ·{' '}
            {view.request.status}
          </Text>
          {view.expiresAt && (
            <Text style={styles.body}>
              Rezervasyon sonu:{' '}
              {new Date(view.expiresAt).toLocaleString('tr-TR')}
            </Text>
          )}
          {!isStudent && view.request.status === 'pending' && (
            <>
              <Button
                title="Onayla"
                disabled={busy}
                onPress={() =>
                  void run(
                    () => services.approveRequest(view.request.id),
                    'Talep onaylandı; stok ayrıldı.',
                  )
                }
              />
              <Button
                title="Reddet"
                disabled={busy}
                onPress={() =>
                  void run(
                    () => services.rejectRequest(view.request.id),
                    'Talep reddedildi.',
                  )
                }
              />
            </>
          )}
          {isStudent &&
            ['pending', 'approved'].includes(view.request.status) && (
              <Button
                title="İptal et"
                disabled={busy}
                onPress={() =>
                  void run(
                    () => services.cancelRequest(view.request.id),
                    'Talep iptal edildi.',
                  )
                }
              />
            )}
          {isStudent && view.request.status === 'approved' && (
            <Button
              title="Kodu oluştur / yenile"
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  const result = await services.issueDeliveryCode(
                    view.request.id,
                  );
                  setIssued({ ...result, requestId: view.request.id });
                }, 'Yeni kod oluşturuldu; önceki kod geçersiz.')
              }
            />
          )}
          {isStudent &&
            issued?.requestId === view.request.id &&
            view.request.status === 'approved' && (
              <Text selectable style={styles.heading}>
                Kod: {issued.code}
              </Text>
            )}
          {!isStudent && view.request.status === 'approved' && (
            <>
              <TextInput
                accessibilityLabel="Teslim kodu"
                value={code}
                onChangeText={setCode}
                placeholder="Öğrencinin 6 haneli kodu"
                maxLength={6}
                keyboardType="number-pad"
                style={{
                  padding: 14,
                  borderWidth: 1,
                  borderColor: colors.inputBorder,
                  borderRadius: 10,
                }}
              />
              <Button
                title="Teslimi tamamla"
                disabled={busy || !/^\d{6}$/.test(code)}
                onPress={() =>
                  void run(async () => {
                    await services.confirmDelivery(view.request.id, code);
                    setCode('');
                  }, 'Teslim tamamlandı.')
                }
              />
            </>
          )}
        </View>
      ))}
    </Screen>
  );
}
