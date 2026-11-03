# Ortak servis sözleşmesi

Güncel tipler: `src/services/contracts.ts`; ortak domain:
`src/types/domain.ts`. Ürün ekranları `services` nesnesini veya bunun öğrenci
wrapper'ını kullanır; doğrudan veritabanı sorgusu yazmaz.

## Kimlik ve adaptörler

Varsayılan `supabase`; `.env` ile açıkça `demo` seçilebilir. Yanlış gerçek
yapılandırma demo başarısına dönüşmez. İki adaptör AppServices uygular.
Yerel demo kayıt açmayı desteklemez, bellekteki örnek hesapları kullanır.

| İşlem | Davranış |
| --- | --- |
| signIn | E-posta/parola ile AppSession döndürür |
| signUp | Gerçek hesap oluşturur; confirmationRequired sonucu verir; rol göndermez |
| signOut | Oturumu kapatır |
| getSession / onAuthStateChange | Sunucudaki profile göre oturum/rol sağlar |
| listListings / listMyListings | Aktif keşif ilanları / kapalılar dahil işletmenin kendi ilanları |
| createListing | id, businessId, quantityReserved ve active durumu sunucudan gelir |
| createNeed / listMyNeeds | İhtiyaç kaydı / öğrencinin kendi ihtiyaçları; sahiplik sunucudadır |
| updateListing / updateNeed | Sahibinin aktif, hiç talep geçmişi olmayan kaydını tam form girdisiyle düzenler |
| closeListing / archiveNeed | Açık talep yoksa sahibinin kaydını kapatır/arşivler; tekrar çağrı güvenlidir |
| createRequest | needId ve listingId alır; miktar ihtiyaçtan okunur |
| listMyRequests / listIncomingRequests | Talep, ilan/proje adı ve expiresAt; açık kod/hash içermez |
| approveRequest / rejectRequest / cancelRequest | Rol, sahiplik, durum ve stok kontrolleriyle işlem |
| issueDeliveryCode | Öğrenciye yalnız bu cevapta açık kod ve expiresAt verir |
| confirmDelivery | İşletme kodu doğrular; teslim ve stok işlemi bir kez uygulanır |

`AppError` code/message taşır. Kullanıcı mesajları ortak yardımcı veya bağlamsal
özellik sözlüğüyle gösterilir. Başarılı mutasyondan sonra yenileme başarısızsa
komutun başarısız olduğu söylenmemeli veya komut otomatik tekrarlanmamalıdır.

## Mevcut iş kuralları

- İhtiyacın tamamını tek ilan karşılar; miktarlar pozitif tam sayıdır.
- Öğrenci kalınlığı zorunludur. İlan kalınlığı null olabilir; böyle ilan talep alamaz.
- Tür, tam kalınlık, normalize edilmiş bölge, döndürülerek sığma, stok ve tarihler kontrol edilir.
- Aynı ihtiyaç için pending/approved/delivered talep sınırı vardır. Aynı aktif
  talebin tekrar oluşturulması aynı kaydı döndürür; iptal/ret sonrası tekrar talep mümkündür.
- Talep gönderirken stok ayrılmaz; onayda tekrar denetlenip ayrılır.
- Rezervasyon 2 saat ve ilan/ihtiyaç tarihlerinin İstanbul gün sonlarıyla sınırlıdır.
  Son teslim tarihi ihtiyaç tarihinden önce olsa da bugün teslim mümkünse uygundur.
- İptal veya süre dolumu rezervasyonu serbest bırakır; teslim toplam/ayrılmış stoğu düşürür.
- Kod yenileme eski kodu iptal eder. En fazla 10 üretim, 5 yanlış deneme vardır;
  yenileme yanlış deneme sayısını sıfırlamaz. Kod tekrar girişte okunamaz, yeniden üretilir.

## Uygulama dosyaları

- `services/supabase.ts`: Auth, alan dönüşümleri, tablo okumaları ve RPC.
- `services/mock.ts`: aynı sözleşmenin bellek içi uygulaması.
- `fixtures/demo.ts`: örnek ilan/ihtiyaç ve demo hesap tanımları.
- `services/validation.ts`: saf girdi ve işlem uygunluğu kuralları.
- `features/student/service.ts`: liste üzerinden ihtiyaç bulma, matching ve durum etiketleri.
- `features/student/matching.ts`: çalışan UI sıralaması/açıklamalar.
- `lib/`: paylaşılan tarih, sayı, etiket ve hata yardımcıları.

Eski `ListingService.list()` / `demoListingService` kaldırıldı; tüketicileri yoktu.
İlan/ihtiyaç yaşam döngüsü ve düzenleme sınırları [Paket 4](package-4-data-rules.md)
belgesindedir. Fotoğraf, bildirim ve yönetici onay paneli henüz bulunmaz.

`npm test`, demo ve gerçek adaptör davranışlarını, gerçek migration üzerinde
PGlite ile SQL/RLS kurallarını ve saf form/eşleşme/yardımcı fonksiyonlarını doğrular.
