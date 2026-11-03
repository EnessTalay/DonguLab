# Supabase kurulumu

Varsayılan mod `demo`: hesap açmadan çalışır. Gerçek Supabase bağlantısı için
aşağıdaki adımları yeni/boş bir proje üzerinde uygulayın. Bu işlem burada canlı
bir projeye uygulanmadı; proje henüz oluşturulmadı.

## 1. Proje ve tablolar

1. Supabase Dashboard'da yeni bir proje oluşturun.
2. SQL Editor içinde `supabase/migrations/202611030001_core.sql` içeriğini bir kez
   çalıştırın. Tablolar zaten mevcutsa migration'ı tekrar çalıştırmayın; ileride
   değişiklikler için yeni migration dosyası ekleyin.
3. İsterseniz Supabase CLI ile mevcut migration klasörünü kullanabilirsiniz:
   `npx supabase init`, `npx supabase login`, `npx supabase link --project-ref REF`,
   `npx supabase db push`. CLI bir geliştirme aracıdır; mobil pakete eklenmez.

## 2. Demo hesapları ve örnek kayıtlar

Dashboard > Authentication > Users > Add user bölümünde şu iki hesabı oluşturun;
e-posta onayını etkin olarak işaretleyin ve parolaları kendiniz belirleyin:

- `ogrenci@demo.local`
- `isletme@demo.local`

Ardından SQL Editor'de `supabase/seed.sql` dosyasını çalıştırın. Seed bu hesaplara
öğrenci/işletme rollerini yönetici yetkisiyle verir ve dört ilan/bir ihtiyaç ekler.
Bu, yalnız kontrollü demo projesi içindir; gerçek kullanıcıları otomatik olarak
işletmeye yükselten bir kayıt akışı değildir. Yeni hesaplar tetikleyiciyle student
rolünde oluşturulur; kullanıcı metadata'sı yetki vermez. Yeni işletmeyi yalnız
yönetici profiles tablosundan yetkilendirmelidir.

Seed tekrar çalıştırılabilir; mevcut stok ve kayıtları sıfırlamaz, tarihleri de
yenilemez. Süresi geçmiş demo verileri için yeni örnek kayıt oluşturun. Supabase
parolaları yerel demodaki `Demo123!` olmak zorunda değildir ve repoya yazılmaz.

## 3. Rezervasyon temizliği

Dashboard > Database > Extensions bölümünde **pg_cron** etkinleştirin. Sonra
SQL Editor'de `supabase/setup-cron.sql` çalıştırın. Dakikada bir süresi dolan
rezervasyonlar cancelled yapılır ve ayrılmış stok bir kez serbest bırakılır.
Job tanımı tekrar kurulabilir. `cron.job` ve `cron.job_run_details` ile sonucu
kontrol edin. Cron kurulumu yerel PGlite testinin parçası değildir.

Liste okuma ve işlemler ayrıca temizlik çağırır; buna rağmen uygulama kapalıyken
temizlik için cron kurulumu gereklidir. Kilitli ilanlar periyodik temizlikte
atlanır ve sonraki çalışmada tekrar ele alınır.

## 4. Uygulama bağlantısı

`.env.example` dosyasını `.env` olarak kopyalayın:

```dotenv
EXPO_PUBLIC_DATA_MODE=supabase
EXPO_PUBLIC_SUPABASE_URL=https://PROJE.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

URL ve publishable anahtarı Dashboard'daki Connect/API bilgileri bölümünden
alınır. Eski anon JWT anahtarı da kabul edilir. service_role / sb_secret anahtarını
uygulamaya koymayın. `.env` Git tarafından dışlanır; EXPO_PUBLIC değerleri mobil
pakette herkese açık olacağından yalnız public anahtar kullanılır.

Expo sunucusunu durdurup yeniden `npm start` veya `npm run web` çalıştırın.
Supabase modunda demo hesap düğmeleri görünmez. Oluşturduğunuz gerçek parolayla
giriş yapın. Eksik bağlantı yapılandırması yerel demoya sessizce dönmez; hata verir.

## 5. İki hesapla kabul

Supabase modunda iki ayrı tarayıcı profili/cihaz kullanın. Öğrenci altyapı test
ekranında ihtiyaçtan uygun ilana talep göndersin. İşletme listeleri yenileyip
onaylasın; ayrılmış stok artsın. Öğrenci yenileyip kod üretsin. İşletme kodla
teslimi tamamlasın; toplam ve ayrılmış stok aynı adet azalsın. Her listede
yenileme düğmesi vardır; ilk sürümde realtime aboneliği yoktur.

Yanlış kod, iptal, yetersiz stok, farklı hesap erişimi ve süresi dolan rezervasyonu
da deneyin. Başka öğrencinin verisi görünmemeli. İşletme teslim kodunu veya hash'i
okuyamaz. Kod yalnız öğrenciye üretim cevabında gelir; kaybolursa yenilenir.

## Güvenlik sınırı ve teknik kararlar

- İstemci tablo güncelleme/ekleme yetkisi almaz. Yazmalar `app_command` RPC'sinde
  auth.uid(), sunucudaki rol, sahiplik ve durum üzerinden doğrulanır.
- Liste RLS politikaları açık ilanları oturum açmış kullanıcılara, ihtiyaçları
  sahibine ve ilgili talebi alan işletmeye, talepleri iki tarafına açar.
- Stok işlemlerinde önce ilan satırı, sonra talep kilitlenir. Aynı onay/iptal/
  teslim tekrarı stoğu ikinci kez değiştirmez. Onayda uygunluk yeniden kontrol edilir.
- Kod sunucuda kriptografik UUID rastgeleliğinden 6 hane üretilir; request ID ile
  tuzlanmış SHA-256 hash saklanır. 5 yanlış deneme ve 10 üretim limiti vardır.
  Hatalı kod RPC zarfında hata döndürür; deneme artışı transaction'da korunur.
- Rol değişikliği ve hesap yönetimi yalnız yöneticiye aittir. Kayıt, parola
  sıfırlama, realtime, mağaza paketi ve üretim izleme bu teslimde yoktur.

Kaynaklar: [Supabase React Native Auth](https://supabase.com/docs/guides/auth/quickstarts/react-native),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[Database functions](https://supabase.com/docs/guides/database/functions),
[pg_cron](https://supabase.com/docs/guides/database/extensions/pg_cron).
