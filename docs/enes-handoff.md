# Enes: teslim ve entegrasyon

## İlk teslim

`66fbc70` commit'i: ortak `AppServices`, girdi/DTO/hata tipleri ve çalışan yerel
adaptör. Diğer kişiler Supabase'i beklemeden bu sözleşmeyle geliştirebilir.
Önce bu teslim ayrı commit olarak `codex/enes-altyapi` dalına gönderildi.

## Kodun giriş noktaları

- `src/services/index.ts`: mode seçimi ve tek `services` nesnesi.
- `contracts.ts`: tüm imzalar ve AppError. UI buradan tip alır.
- `mock.ts`: bellekte demo servis; yeniden yüklenince sıfırlanır.
- `supabase.ts` / `client.ts`: gerçek servis, alan dönüşümleri ve oturum depolama.
- `session.tsx`: oturum yükleme, değişiklik aboneliği ve native token yenileme.
- `src/app/sign-in.tsx`: giriş ekranı; demo hesap düğmeleri yalnız demoda.
- `_layout.tsx`: oturum/rol bazında mevcut öğrenci ve işletme girişlerini korur.
- `src/app/workbench.tsx`: Enes'in servisleri elle deneyebileceği araç. Öğrenci/
  işletme ürün formlarının yerine geçmez. Gerçek modda düğmeler gerçek kayıt yazar.
- `supabase/`: migration, admin seed ve cron kurulumu.

## Nasıl denenir?

Node.js 22.23.4 ile `npm ci`, `npm run web`. Varsayılan mod demo; .env gerekmez.
Öğrenci demo hesabıyla giriş > altyapı test ekranı > Mimari maket için ilk uygun
ahşap ilana talep gönder. Ana sayfaya dön, çıkış yap. İşletme demo hesabıyla
giriş > test ekranı > talebi onayla. Aynı sayfayı yeniden yüklemeden öğrenciye
dön, kod üret ve not al. İşletmeye dönüp kodu gir. Talep delivered olmalı.

Yerel demo tek JavaScript çalışma alanında yaşar: farklı sekme/cihaz bağımsızdır.
Tam sayfa yenileme verileri ve oturumu sıfırlar. Bu yüzden demo hesabını değiştirmek
için uygulamanın Çıkış/Giriş düğmelerini kullanın. Gerçek oturum kalıcıdır ve
Supabase kullanıcıları cihazlar arasında ortak sunucu verisini okur.

## Ekip entegrasyonu

Fatmanur ve Canan'ın formları ile Emine'nin motoru henüz repoda yoktur. Başlangıç
`student/index.tsx`, `business/index.tsx` ve `src/matching` dosyaları değiştirilmedi.
Bu eksik parçalar varmış gibi bağlanmadı ve ikinci bir UI eşleştirme motoru yazılmadı.

1. İlgili kişinin dalını fetch edip değişikliğini inceleyin, dosya sahibiyle haberleşin.
2. Geçici adaptör yerine `import { services } from '@/services'` kullanın.
3. İhtiyaç/ilan kimliklerini form üretmesin; sunucuya yalnız CreateNeedInput /
   CreateListingInput verin. UI hatalarını AppError üzerinden gösterin.
4. listMyRequests/listIncomingRequests DTO'larını mevcut kartlara bağlayın.
5. Emine'nin `matchListing`/`rankMatches` çıktısını öğrenci ekranına bağlayın.
   Aynı girdiler için SQL işlem kurallarıyla parite testi ekleyin. Bugün teslim
   mümkünse ilan son gününün ihtiyaç gününden önce olması tek başına ret değildir.
6. Yeni öğrenci/işletme alt yolları eklenince root route korumalarını gözden geçirin;
   mevcut guard'lar şu anki index yollarını kapsar. RLS her durumda asıl yetkidir.
7. `npm run check`, `npm test`, `npm run export:web`, iki gerçek hesap/cihaz kabulü.

## Doğrulamanın sınırları

**Güncelleme:** Canlı proje 3 Kasım 2026 tarihinde kuruldu ve aşağıda önceki
teslimde bekleyen sunucu kontrolleri uygulandı. Güncel kayıt
`docs/live-supabase-verification.md` içinde. Aşağıdaki canlı proje yok notu ilk
teslim anına aittir.

Yerelde geçen kontroller: TypeScript/lint (`npm run check`), 15 servis/SQL davranış
testi, web dışa aktarımı, Expo Doctor 21/21. Ayrıca 390 x 844 tarayıcı görünümünde
misafir rota koruması ve hesap değiştirerek talep -> onay -> kod -> teslim akışı
çalıştırıldı; son stok doğrulandı ve tarayıcı JavaScript hatası oluşmadı.

`tests/service.test.cjs` demo akışını; `tests/database.test.cjs` gerçek migration'ı
PGlite PostgreSQL içinde çalıştırır. Testte yalnız Supabase platformunun auth.users /
auth.uid() arayüzü taklit edilir; RLS, grant'ler ve RPC gövdeleri aynen çalışır.
PGlite tek bağlantılıdır: gerçek çok bağlantılı eşzamanlılık testi değildir.
Sunucu kilit sırası kodda uygulanır; canlı Supabase üzerinde aynı anda iki onay
senaryosu ayrıca denenmelidir.

Gerçek Supabase projesi/anahtarı henüz yok. Canlı Auth, cihazlar arası veri,
Android/iOS native oturum geri yükleme ve pg_cron burada doğrulanmadı. Ayrıntılı
kurulum `docs/supabase-setup.md` içinde. Docker Desktop kurulu olsa da servisi
kapalıydı; yerel Supabase container'ı başlatılmadı.
