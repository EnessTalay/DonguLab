# Paket 4 — Veri modeli ve iş kuralları

> Bu paket tesliminin tarihsel kaydıdır. Öğrenci/işletme arayüzleri ve sonraki
> migration gereksinimleri için [Paket 5–6](package-5-6-completion.md) esas alınır.

Başlangıç: Paket 3 / `22ca2c1`. Dal: `codex/package-4-data-rules`.

## Kayıtların yaşam döngüsü

| Kayıt | Durumlar | Geçiş |
| --- | --- | --- |
| İlan | active, closed | İşletme sahibi active → closed yapabilir |
| İhtiyaç | active, archived | Öğrenci sahibi active → archived yapabilir |
| Talep | pending, approved, rejected, cancelled, delivered | pending → approved/rejected/cancelled; approved → delivered/cancelled |
| Teslim | Talebe bağlı özel kod kaydı | Onaydan sonra kod üretimi; doğru kodla delivered |

Yeni kayıtlar daima active oluşturulur. Durum, sahiplik ve ayrılmış stok istemciden
atanamaz. Kapatma/arşivleme tekrar çağrıldığında aynı sonuç döner. Yeniden açma ve
silme işlemi yoktur; geçmiş ve teslim bağlantıları korunur. Süresi geçen ilan
otomatik closed yapılmaz; tarih kontrolü yeni talepleri engeller. Stok bitmesi de
durumu değiştirmez. İhtiyacın tamamlanması delivered talebinden anlaşılır.

## Düzenleme ve açık talepler

- `updateListing(id, input)` ve `updateNeed(id, input)` tam form girdisi alır.
  Yalnız sahibi, aktif ve hiç talep geçmişi bulunmayan kaydı düzenleyebilir.
- İlanın başlık, tür, boyutlar, kalınlık, toplam adet, bölge ve teslim tarihi;
  ihtiyacın proje adı, tür, boyutlar, kalınlık, adet, bölge ve ihtiyaç tarihi değişebilir.
- Bekleyen/onaylı talepler varken hiçbir alan değişmez; kapatma/arşivleme de
  CONFLICT döndürür. Önce talep reddedilmeli, iptal edilmeli veya teslim edilmelidir.
- Ret/iptal/teslim geçmişi bulunan kayıt da düzenlenmez. Bu ilk sürümde geçmiş
  ekranları aynı kayda referans verdiğinden başlık dahil bilgiler dondurulur.
  Yeni malzeme veya değişen ihtiyaç için yeni kayıt açılır. Ayrı revizyon/snapshot
  modeli olmadan geçmişi değiştiren düzenlemeye izin verilmez.
- Kapalı/arşivlenmiş kayda yeni talep gönderilemez. Tamamlanmış aynı talebin tekrar
  gönderimi mevcut idempotent sonucu korur; yeni işlem oluşturmaz.
- Kapatma/arşivleme stoğu düşürmez. Süresi geçmiş onaylar işlem öncesi temizlenir;
  rezervasyon yalnız bir kez serbest bırakılır. Ayrılmış stoğu bulunan ilan kapanmaz.
- `listListings` keşif listesi yalnız active ilanları döndürür. `listMyListings`
  ve `listMyNeeds` geçmiş dahil tüm sahip olunan kayıtları durumlarıyla döndürür.
  RLS ilan okumayı oturum açanlara açmaya devam eder; closed gizli veri değildir.

## Eşleşme ve rezervasyon

Bir ihtiyaç tek ilandan tam karşılanır; adet pozitif tam sayıdır. Malzeme türü ve
kalınlık tam eşleşir; ihtiyaç kalınlığı zorunludur. İlanda kalınlık bilinmiyorsa
talep alınamaz. En/boy 90 derece döndürülebilir; kesim payı ve bir levhadan çok
parça çıkarma hesabı yoktur. Bölge Türkçe küçük harf ve birleştirilmiş boşluklarla
karşılaştırılır; mesafe/coğrafi yakınlık hesabı yapılmaz.

Her iki tarih İstanbul'da bugün veya sonrası olmalıdır. İlanın son teslim tarihi
ihtiyaç tarihinden önce olabilir: bugün teslim mümkünse eşleşme uygundur.
Onayda uygunluk ve kullanılabilir stok yeniden kontrol edilir. Onay rezervasyonu
iki saat ile her iki tarihin İstanbul gün sonundan en erken olanında biter.
Talep gönderimi stok ayırmaz; onay ayırır; iptal/süre dolumu serbest bırakır;
teslim toplam ve ayrılmış stoğu aynı miktarda düşürür. Kod ve deneme sınırları
değişmedi: 10 üretim, 5 yanlış deneme; açık kod yalnız öğrenciye üretim cevabında.

## Migration ve servisler

`202611030002_lifecycle.sql` mevcut şemanın üzerine uygulanır. Eski kayıtları
active başlatır; stok, rezervasyon, talep, kod veya sahipliği sıfırlamaz. İlk
migration değiştirilmedi. Güncel `app_command` yeni dört işlemi ve lifecycle
uygunluğunu sunucuda denetler. Direkt tablo yazma yetkisi verilmez.

İlan işlemleri ilanı, stok işlemleri ardından talepleri kilitler. İhtiyaç
işlemleri ve talep oluşturma önce ihtiyacı kilitler; arşivlemede ilgili ilan ve
talep kilitleri bundan sonra alınır. İlan/talep işlemleri ihtiyaç kilidi almaz.
İhtiyacı kilitlemeden önce genel rezervasyon temizliği çağrılmaması kilit
sırasının ters dönmesini önler.

Demo ve Supabase adaptörleri aynı AppServices sözleşmesini uygular. Bu pakette
öğrenci/işletme ekranları için lifecycle veri ve yetki altyapısı sağlandı.
Paket 5/Aşama 1 öğrenci ihtiyaç düzenleme/arşivleme arayüzünü bu sözleşmeye
bağlar; işletme ilan düzenleme/kapatma arayüzü sonraki aşamanın kapsamındadır.

## Doğrulama ve dağıtım sınırı

- `npm run check`: TypeScript ve lint geçti.
- `npm run export:web`: 28 rota/alias ile web çıktısı üretildi.
- `npm test`: 31/31 geçti; eski şema üzerinde onaylı talep oluşturup yeni migration'a geçiş;
  stok/geçmiş korunması, teslim devamlılığı, sahiplik/rol, alan sahteciliği,
  açık talepler, tekrarlanan kapatma/arşiv, süre dolumu ve eşleşme kontrolleri.
- SQL testleri gerçek migration dosyalarını sıralı olarak PGlite üzerinde çalıştırır.
  PGlite tek bağlantılıdır; çok bağlantılı PostgreSQL deadlock/yük testi değildir.
- Canlı Supabase'e migration uygulanmadı. Uygulamanın bu sürümü kullanılmadan
  önce mevcut veritabanına yalnız ikinci migration uygulanmalıdır; kurulum
  ayrıntıları `supabase-setup.md` içindedir.
