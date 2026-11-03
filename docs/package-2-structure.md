# Paket 2 — Kod ve klasör yapısı

Başlangıç: `package-1-start` / `3439c51`, envanter: `220b890`.
Çalışma dalı: `codex/package-2-structure`. Tarih: 3 Kasım 2026.

## Yapılanlar

| Paket 1 maddesi | Sonuç |
| --- | --- |
| B01 — Eski README | Kurulum, varsayılan Supabase modu, mevcut akışlar, klasörler ve kontroller güncellendi |
| B02 — Eski mimari/sözleşme | Güncel mimari ve AppServices belgesi yazıldı; eski teslimler tarihsel olarak işaretlendi |
| B04 — 947 satırlık işletme ekranı | Rota tek satırlık dışa aktarıma dönüştü; ekran bileşimi, form, listeler, tarih/teslim alanı, kaynak ve komut hook'ları ayrıldı |
| B05 — Screen içinde karışık sorumluluklar | Saf ScreenFrame, oturum/rota bilen AppNavigation ve kısa Screen bileşimi oluşturuldu |
| B06 — Ortak sunum/yardımcı tekrarları | InputField, Card, StatusBadge ve yükleme destekli ActionButton paylaşıldı; etiket/tarih/sayı/hata kodları lib altında toplandı; ortak renkler token'lara bağlandı |
| B08 — Farklı kaynak yükleme yaklaşımları | Genel bakış, öğrenci listeleri ve işletme kaynakları ortak useFocusedResource kullanıyor |

## İşletme ayrımı

- `src/app/business/index.tsx`: yalnız BusinessScreen dışa aktarımı.
- `features/business/BusinessScreen.tsx`: bölüm seçimi, metrikler, alt bileşenler.
- `use-business.ts`: ekran filtreleri ve alt model bileşimi.
- `use-business-resources.ts`: ilan ve talep yükleme/yenileme sonuçları.
- `use-listing-form.ts`: form durumu, tarih seçici, gönderim/yenileme davranışı.
- `listing-form.ts`: saf ayrıştırıcı ve form tipleri.
- `pickup-date.ts`: ilan tarihinin doğrulanması ve picker başlangıç değeri.
- `use-business-requests.ts`: onay, ret ve teslim işlemleri.
- `components/ListingForm`, `PickupDateField`, `ListingList`, `IncomingRequests`,
  `DeliveryConfirmation`: kullanılan model alanlarıyla sınırlandırılmış görünüm bileşenleri.
- `errors.ts`, `styles.ts`: özellik düzeyindeki bağlamsal mesajlar ve yerleşimler.

Diğer ekranlar da auth/home/student/developer özellik dizinlerine taşındı.
Router adresleri ve rol korumaları değişmedi; navigator layout'ları src/app içinde kaldı.

## Temizlenenler ve korunanlar

- Kullanılmayan ListingService/demoListingService ve MatchCard/RequestStateView/NeedSnapshot kaldırıldı.
- Demo hesap/ilan/ihtiyaç tanımları `fixtures/demo.ts` içine taşındı; demo adaptörü korunuyor.
- Eski matching klasör belgesi çalışan motorun konumuna yönlendiriyor.
- Workbench geliştirme özelliği altında; yayın sürümünde erişimi yine kapalı.
- Kullanılmayan yerel stil anahtarları temizlendi; ortak bileşenler işletme stil dosyasına bağımlı değil.
- Sunucu stok, sahiplik, rol, talep ve teslim iş kuralları; SQL migration ve AppServices imzaları korunuyor.
- Yeni proje bağımlılığı eklenmedi. Form ve görünüm dosyaları geçici formatter ile düzenlendi;
  formatter proje bağımlılığı olarak kurulmadı.

## Kontroller

- TypeScript ve Expo lint.
- 22 servis/SQL/saf fonksiyon testi; ayrılan ilan formu ve İstanbul gün sınırı için iki regresyon testi eklendi.
- Ürün web derlemesi ve ayrı yerel demo web derlemesi.
- Ayrı yerel demo paketinde tarayıcıdan ilan oluşturuldu; bölüm değişiminde form
  değerlerinin korunduğu görüldü. Öğrenci ihtiyacı, eşleşme ve talep oluşturma;
  işletme onayı, öğrenci teslim kodu ve işletme teslim doğrulaması tamamlandı.
  Deneme ilanının stoğu 7'den 5'e düştü, ayrılmış stok 0 oldu; teslim geçmişe geçti.
- Yerel tarayıcı konsolunda hata kaydı görülmedi. Bu deneme canlı Supabase veya
  fiziksel cihaz kabulü değildir. Görsel çıktı yerel `output/package2-review.jpg` dosyasıdır.

## Kapsam sınırı

Tam görsel tasarım birliği Paket 9'da, gezinme davranışı Paket 3'te ele alınır.
Yeni ilan/ihtiyaç düzenleme, arşivleme, veritabanı alanı veya yönetici paneli
eklenmedi. B09 ve sonraki ürün eksikleri açık kalır. Fiziksel cihaz ve canlı
Supabase kabulü bu yapısal değişikliğin otomatik testleriyle tamamlanmış sayılmaz.
