# Paket 1 — Mevcut durum ve eksik haritası

İnceleme tarihi: **3 Kasım 2026**. Bu belge Paket 2 ve sonraki çalışmaların
başlangıç envanteridir. Mevcut uygulama davranışı bu pakette değiştirilmez.

## 1. Git başlangıç noktası

- Çalışma dalı: `codex/package-1-baseline`.
- Önceki kayıt: `fdfde08` (Enes altyapısı ve önceki canlı doğrulama belgesi).
- Birleştirilmiş uygulama: **`3439c51`**, `package-1-start` etiketiyle işaretlenen ayrı snapshot commit'i.
- Snapshot; Fatmanur öğrenci akışını, Canan işletme ekranını, Enes altyapısını ve
  bu konuşmada daha önce yapılan düzenlemeleri birlikte içerir.
- Etiket uygulama kodunun inceleme öncesindeki durumunu gösterir. Bu envanter
  ve README bağlantısı sonraki ayrı belge commit'inde yer alır.
- `.env`, `.env.demo-accounts`, `node_modules/`, `.expo/`, `dist/`, `output/` ve
  `tmp/` snapshot kapsamına alınmaz. Yerel dosyalar silinmez. GitHub'a gönderim yapılmaz.

Snapshot'ı mevcut çalışma ağacını değiştirmeden incelemek için:

```sh
git show --stat package-1-start
git log --oneline package-1-start -1
```

## 2. Durum ve kanıt tanımları

- **Çalışıyor:** uygulama kodu mevcut; ilgili saf servis/SQL davranışı testlerle
  veya önceki yerel arayüz denemesiyle destekleniyor. Üretimde kusursuzluk iddiası değildir.
- **Eksik:** temel davranış var, kullanıcı deneyimi veya kapsamı tamamlanmamış.
- **Hatalı:** mevcut kaynaklarda doğrulanmış tutarsızlık var.
- **Yok:** ekran, servis veya veri alanı henüz uygulanmamış.

Bu paketin yeni kanıtı: kaynak incelemesi, TypeScript, lint, 20 servis/SQL testi
ve web derlemesi. `docs/product-audit.md` önceki yerel arayüz denemesini;
`docs/live-supabase-verification.md` daha eski altyapı canlı denemesini kaydeder.
Bu paket sırasında canlı veritabanı, e-posta gönderimi veya iki fiziksel cihaz
yeniden test edilmedi. Önceki testler yeni ekranların canlı kabulü sayılmaz.

## 3. Ekran ve erişim envanteri

9 ürün/geliştirici ekranı ve 2 navigator layout'u vardır. Router'ın ürettiği
`_sitemap` ve not-found sayfaları ürün ekranı sayısına dahil değildir.

| Rota / kaynak | Erişim | Mevcut davranış | Durum / açık iş |
| --- | --- | --- | --- |
| `/` — `src/app/index.tsx` | Herkes | Tanıtım, role göre özet sayıları, çıkış, ana eylemler | Çalışıyor; genel bakışta fazla içerik ve ekran içi stil var |
| `/sign-in` — `src/app/sign-in.tsx` | Oturumsuz | Giriş, öğrenci kaydı, e-posta onayı açıklaması | Eksik; parola kurtarma ve otomatik onay dönüşü yok |
| `/student` — `src/app/student/index.tsx` | Öğrenci | İhtiyaç listesi, yerel proje/bölge araması, yeni ihtiyaç | Eksik; aktif/arşiv ayrımı ve sunucu sayfalaması yok |
| `/student/new-need` | Öğrenci | Ölçü, kalınlık, adet, bölge, tarih ile ihtiyaç kaydı | Çalışıyor; taslak saklama ve ayrılma uyarısı yok |
| `/student/needs/[id]` | Öğrenci | Sahibi olunan ihtiyacın özeti ve eşleşmelere geçiş | Eksik; düzenleme, arşiv, ilişkili talepler bağlantısı yok |
| `/student/matches/[needId]` | Öğrenci | Uygun/tüm ilanlar, açıklamalar, talep gönderme | Eksik; ayrı ilan detayı ve mevcut talep göstergesi yok |
| `/student/requests` | Öğrenci | Aktif/geçmiş filtreleri, iptal onayı, teslim kodu | Eksik; ayrı talep detayı ve işlem geçmişi yok |
| `/business` — `src/app/business/index.tsx` | İşletme | İlanlarım/yeni ilan/gelen talepler, filtre, onay/ret/teslim | Eksik; düzenleme/kapatma yok; 947 satırlık tek dosya |
| `/workbench` | Oturum + `__DEV__` | Teknik servis test işlemleri | Çalışıyor; ürün ekranı değildir, yayın erişimi korunur |
| `src/app/_layout.tsx` | — | SessionProvider, kök Stack, rol korumaları | Çalışıyor; gezinme davranışı Paket 3'te cihazda değerlendirilmeli |
| `src/app/student/_layout.tsx` | Öğrenci üst koruması | Öğrenci Stack ve ekran başlıkları | Çalışıyor; alt gezinme ortak Screen içinde elle çiziliyor |

## 4. Kod modülleri ve sorumluluklar

| Kaynak | Sorumluluk | Not |
| --- | --- | --- |
| `src/components/screen.tsx` | Safe area, scroll, marka, başlık, alt gezinme, ortak stiller | Sunum + oturum + rota karışmış |
| `src/components/ui.tsx` | ActionButton, Metrics, Feedback | Ortak temel bileşenler mevcut |
| `src/components/choice-chips.tsx` | Seçim/filtre düğmeleri | Öğrenci ve işletme kullanıyor |
| `src/theme/tokens.ts` | Renkler | Kısmi kullanım; ekranlarda sabit renkler sürüyor |
| `src/hooks/use-focused-resource.ts` | Odakta yükleme, yeniden deneme, eski cevabı reddetme | Öğrenci detay/eşleşme/talepler kullanıyor; diğer listeler ayrı mantıkta |
| `src/features/student/components/NeedForm.tsx` | Öğrenci formu ve alan mesajları | 283 satır; ortak alan bileşeni adayı |
| `src/features/student/need-form.ts` | Saf form ayrıştırma/doğrulama | Servis sınırlarıyla regresyon testi var |
| `src/features/student/matching.ts` | Uygunluk açıklaması ve sıralama | Fiilen çalışan motor burada; `src/matching/` içinde değil |
| `src/features/student/service.ts` | AppServices üstünde öğrenci kolaylık işlemleri | UI DTO'suna durum etiketi ekliyor |
| `src/features/student/types.ts` | Form tipleri ve eski görünüm tipleri | Kullanılmayan dışa aktarımlar var; aşağıdaki aday listesine bakın |
| `src/types/domain.ts` | Role, MaterialType, Listing, Need, MaterialRequest, RequestStatus | Ortak alan modeli |
| `src/services/contracts.ts` | AppServices, girdiler, DTO'lar, AppError | İşlemlerin tek sözleşmesi |
| `src/services/index.ts` | Demo/Supabase adaptörü seçimi | Varsayılan Supabase; geçersiz ayarda sessiz demo yok |
| `src/services/client.ts` | Tek Supabase istemcisi, public anahtar kontrolü, oturum depolama | Gizli anahtar reddediliyor |
| `src/services/session.tsx` | Oturum context'i, auth dinleyicisi, native yenileme | Ekran erişiminin kaynağı |
| `src/services/supabase.ts` | Auth, tablo okumaları, RPC, camelCase dönüşümü | Ekranlarda doğrudan sorgu yok |
| `src/services/mock.ts` | Aynı sözleşmenin bellek içi uygulaması | Gerçek kayıt desteklemez; güvenlik sınırı değildir |
| `src/services/demo.ts` | Yerel örnek ilan/ihtiyaç ve eski ListingService | Örnek kayıtlar gerekli; eski servis adayı ayrı |
| `src/services/validation.ts` | Tarih, malzeme, giriş ve işlem uygunluğu | SQL ile aynı temel iş kuralları hedefleniyor |

## 5. Servis işlemleri

| Grup | Mevcut AppServices işlemleri | Sınır |
| --- | --- | --- |
| Kimlik | `signIn`, `signUp`, `signOut`, `getSession`, `onAuthStateChange` | Yeni rol istemciden verilmez; öğrenci kaydı var |
| İlan | `listListings`, `listMyListings`, `createListing` | Güncelleme, kapatma, fotoğraf yok |
| İhtiyaç | `createNeed`, `listMyNeeds` | Tek kayıt okuma öğrenci wrapper'ında liste üzerinden; güncelleme/arşiv yok |
| Talep | `createRequest`, `listMyRequests`, `listIncomingRequests` | Ayrı talep detayı/olay geçmişi yok |
| Karar | `approveRequest`, `rejectRequest`, `cancelRequest` | Sahiplik ve durum sunucuda doğrulanır |
| Teslim | `issueDeliveryCode`, `confirmDelivery` | Açık kod yalnız üretim cevabında; listelerde kod/hash yok |

## 6. Veritabanı ve kurallar

Tek migration: `supabase/migrations/202611030001_core.sql`.

| Nesne | İşlev |
| --- | --- |
| `profiles` | Auth kullanıcı UUID'si, student/business rolü, görünen ad |
| `listings` | İşletme sahibi, malzeme ölçüleri, toplam/ayrılmış stok, bölge, son tarih |
| `needs` | Öğrenci sahibi, proje, malzeme ölçüleri, adet, bölge, ihtiyaç tarihi |
| `requests` | İhtiyaç–ilan bağı, öğrenci, miktar, durum ve rezervasyon bitişi |
| `deliveries` | Kod hash'i, yanlış deneme/üretim sayaçları ve teslim zamanı; istemciye doğrudan okuma verilmez |
| Profil trigger'ı | Yeni Auth kullanıcısını öğrenci yapar; metadata işletme yetkisi vermez |
| RLS politikaları | Profil/ ihtiyaç/ talep sahipliği ve ilişkili işletme okuma sınırları |
| `app_command` | create_listing, create_need, create_request, approve_request, reject_request, cancel_request, issue_delivery_code, confirm_delivery |
| `list_request_views` | Rol bazlı talep DTO'su; ilan/proje adı ve rezervasyon bitişi |
| `refresh_reservations` | Süresi dolan rezervasyonları serbest bırakır |
| `app_private` fonksiyonları | Rol, uygunluk, normalizasyon, kilit ve işlem yardımcıları |
| `supabase/seed.sql` | Yönetici tarafından örnek hesaplara rol/örnek kayıt ekleme; normal kayıt akışı değildir |
| `supabase/setup-cron.sql` | pg_cron ile dakika bazında süre temizliği; canlı kurulum durumu bu pakette kontrol edilmedi |

Mevcut kurallar: ihtiyaç tek ilandan bütünüyle karşılanır. Aynı ihtiyaç için
pending/approved/delivered taleplerin tekrarına sunucu sınır koyar. Stok talep
gönderirken ayrılmaz; onayda ayrılır, teslimde düşer, iptal/süre dolumunda serbest
kalır. Uygunluk tür, tam kalınlık, döndürülerek sığma, normalize bölge, stok ve
geçerli tarihlere bağlıdır. İhtiyaç ve ilan tarihleri arasında ek sıralama kuralı
şu an yoktur. Rezervasyon en fazla 2 saat ve ilgili tarihlerin gün sonlarıyla sınırlıdır.

## 7. Kullanıcı akışları

### Öğrenci

```text
Ana sayfa → Giriş / öğrenci kaydı
  → gerekiyorsa e-posta onayı → tekrar giriş
  → Genel bakış → İhtiyaçlarım → Yeni ihtiyaç → İhtiyaç detayı
  → Uygun ilanlar → Talep gönder → Aktif talepler
  → işletme onayı beklenir → Teslim kodu oluştur → işletmeye göster
  → işletme teslimi doğrular → Geçmiş / Teslim edildi
```

Alternatifler: uygun ilan yoksa tüm ilanlarda nedenleri inceleme; hata durumunda
yenileme; bekleyen/onaylı talebi onay adımıyla iptal; reddedilen/iptal edilen
ihtiyaç için tekrar eşleşme. Mevcut talebi eşleşme kartında önceden görmek eksik.

### İşletme

```text
Hesap → ekip tarafından Supabase üzerinden işletme rolü → giriş
  → Genel bakış → İşletmem
  → Yeni ilan → İlanlarım / stok görünümü
  → Gelen talepler → Onayla veya Reddet
  → onayda rezervasyon → öğrenci teslim kodunu getirir
  → Teslimatı doğrula → tamamlanmış talep / güncel stok
```

Başvuru toplama, onay paneli, ilan düzenleme/kapatma ve ayrı talep detayı henüz yok.

## 8. Tek eksik ve düzeltme listesi

Öncelik: P1 ana akış/yanlış bilgi; P2 kullanım ve bakım; P3 sonraki kapsam.

| ID | Durum | Öncelik | Somut iş / kaynak | Paket |
| --- | --- | --- | --- | --- |
| B01 | Hatalı | P1 | README hâlâ varsayılan demo ve ürün ekranları yok diyor; kod Supabase ve gerçek formlar kullanıyor | 2 |
| B02 | Hatalı | P1 | architecture, service-contract, matching README eski planları güncel durum gibi anlatıyor | 2 |
| B03 | Eksik | P1 | İki fiziksel cihazda yeni ekranların canlı kabulü yapılmadı; önceki altyapı testinden ayrılmalı | 10 |
| B04 | Eksik | P2 | 947 satırlık business ekranı form, tarih, stok, talep, teslim, hata ve stilleri içeriyor | 2 |
| B05 | Eksik | P2 | Screen bileşeninde oturum/rota ile sunum sorumlulukları karışık | 2–3 |
| B06 | Eksik | P2 | Renk, durum etiketi, alan/düğme ve tarih biçimleri birden fazla yerde ayrı tanımlı | 2, 9 |
| B07 | Eksik | P2 | Form taslağı ve kaydetmeden ayrılma uyarısı yok | 5 |
| B08 | Eksik | P2 | Liste yükleme/yenileme yaklaşımı tüm ekranlarda aynı değil | 2–3 |
| B09 | Eksik | P1 | Düzenleme/arşiv/kapatma için ürün kuralları ve servis/RPC sözleşmesi yok | 4 |
| B10 | Yok | P1 | İhtiyaç düzenleme, arşiv ve aktif/geçmiş ihtiyaç listesi | 5 |
| B11 | Yok | P1 | İlan düzenleme/kapatma ve mevcut rezervasyonlarla güvenli stok değişimi | 6 |
| B12 | Yok | P2 | İlan açıklaması, teslim yeri/saat alanları ve ayrı ilan detayı | 4, 6–7 |
| B13 | Eksik | P1 | Eşleşme kartında aynı ihtiyaç için mevcut talep görünmüyor; sunucu tekrar işlemi engelliyor | 7 |
| B14 | Eksik | P2 | Malzeme/bölge filtreleri ve ihtiyaç–ilan karşılaştırma düzeni | 7 |
| B15 | Yok | P2 | Ayrı talep detayı ve olay geçmişi | 8 |
| B16 | Eksik | P2 | UI süre dolumunu periyodik/yenilemeyle görüyor; arka plandan dönüş ve eski durum senaryoları doğrulanmalı | 8 |
| B17 | Eksik | P1 | Mutasyon başarılı / sonraki yenileme başarısız durumları tüm ekranlarda tutarlı anlatılmalı | 8 |
| B18 | Eksik | P2 | Geri/alt menü geçmişi, klavye, büyük yazı ve ekran okuyucu kabulü tamamlanmadı | 3, 9 |
| B19 | Eksik | P2 | Filtreleme bellekte; sayfalama ve sanallaştırılmış uzun listeler yok | 9 |
| B20 | Eksik | P2 | Bölge serbest metin; şehir/ilçe ortak seçimi yok | 4–7 |
| B21 | Eksik | P1 | 20 test servis/SQL/saf kuralları kapsıyor; hook, bileşen ve cihaz testleri yok | 10 |
| B22 | Yok | P3 | İşletme başvuru/onay paneli; rol şu an yönetici SQL işlemiyle veriliyor | Sonraki çalışma |
| B23 | Yok | P3 | Parola kurtarma, otomatik mobil onay dönüşü, hesap silme | Sonraki çalışma |
| B24 | Yok | P3 | Fotoğraf yükleme, bildirim, uygulama içi iletişim | Sonraki çalışma |
| B25 | Eksik | P2 | CI dosyası var; bu pakette uzak Actions çalıştırılıp doğrulanmadı | 10 |

## 9. Kod temizliği ve eski metin adayları

Bu liste silme talimatı değildir; Paket 2'de referans ve davranış kontrolüyle ele alınır.

| Aday | Kaynak kanıtı | İşlem önerisi |
| --- | --- | --- |
| `ListingService`, `demoListingService` | `src/services/demo.ts` dışında src referansı bulunmadı | Eski servis kaldırılabilir; demoListings/demoNeed korunmalı |
| `MatchCard`, `RequestStateView`, `NeedSnapshot` | `src/features/student/types.ts` dışında src referansı bulunmadı | Kullanılmayan tipleri kaldır; MatchResult ile tekrarları birleştir |
| `src/matching/README.md` | Motor yok diyor; çalışan matching.ts başka dizinde | Geçerli konuma yönlendir veya yeni yapıyla birleştir |
| `src/app/workbench.tsx` metni | Ürün formları daha geliştirilecek diyor | Geliştirici araçlarını ayrı alana taşı, açıklamayı güncelle |
| Sabit renk ve StyleSheet tekrarları | theme, screen, form, business, requests, matches, sign-in | Tasarım token'ları ve ortak bileşenlere taşı |
| Malzeme/durum etiketleri | business, student service, detay/matches ve requests | Tek sunum sözlüğü oluştur |
| Tarih ve sayı ayrıştırma | business yardımcıları, need-form, validation | Ortak yardımcılar + alan odaklı hata mesajları |
| Kullanılmayan stil anahtarları | Örneğin matches loading/empty, need-detail empty | Bileşen ayrıştırması sonrası statik referans kontrolüyle temizle |
| `docs/enes-handoff.md`, `verification.md`, `merge-notes.md` | Önceki aşamalara ait teslim kayıtları | Tarihsel kayıt olarak etiketle; güncel kılavuzla karıştırma |

Demo etiketleri ve `services.mode === 'demo'` uyarıları gerçek demo kullanımında
gereklidir; topluca silinmez. Gizli yerel dosyalar envantere içerikleriyle alınmaz.

## 10. Doğrulama ve Paket 2'ye teslim

- Node **22.22.0** ile kontrol edildi; package.json aralığına uygundur.
  Repo `.nvmrc`/`.node-version` değeri **22.23.4**; tam bu sürümle yeniden doğrulama bu pakette yapılmadı.
- `npm run check`: TypeScript ve lint başarılı.
- `npm test`: **20/20** başarılı; servis, SQL/RLS, form ve eşleşme testleri.
- `npm run export:web`: başarılı; 11 statik rota, `dist/` çıktısı.
- `git diff --check`: whitespace hatası yok.
- Snapshot adaylarında gizli anahtar/özel anahtar biçimi taraması yapıldı;
  `sb_secret_…` veya private-key başlığı eşleşmesi bulunmadı. Bu kapsamlı bir güvenlik denetimi değildir.

Paket 2'nin ilk işleri **B01, B02, B04, B05, B06 ve B08** olmalı. Önce mevcut
davranışı koruyarak dosyaları bölmek ve eski belgeleri düzeltmek; yeni özellik,
veritabanı alanı veya bağımlılık eklememek gerekir. B09 sonrasındaki ürün
değişiklikleri ilgili sonraki paketlere bırakılır.
