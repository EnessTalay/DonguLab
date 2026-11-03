# Uygulama içi düzenleme — 3 Kasım 2026

> Tarihsel teslim/inceleme kaydıdır. Güncel kod yapısı için [mimari](architecture.md),
> mevcut sözleşme için [servis belgesi](service-contract.md), değişiklikler için
> [Paket 2](package-2-structure.md) esas alınmalıdır. Aşağıdaki test sonuçları kendi dönemine aittir.

Bu çalışma yayın, mağaza veya bildirim entegrasyonu yerine mevcut öğrenci ve
işletme akışlarının tutarlılığına odaklanır.

## Düzeltilen bulgular

| Bulgu | Düzenleme |
| --- | --- |
| Form hata anahtarlarını `undefined` ile tutuyor; düzeltmeden sonra Kaydet kilitlenebiliyor | Hata anahtarı silinir; her gönderimde alanlar yeniden doğrulanır |
| Zorunlu kalınlık isteğe bağlı gösteriliyor | Alan zorunlu açıklanır ve kayıttan önce doğrulanır |
| Tarihler yalnız `Date` ile kontrol ediliyor | Gerçek takvim günü, YYYY-AA-GG biçimi ve geçmiş tarih sınırı uygulanır |
| UI ile sunucu sayı/metin sınırları farklı | Form ayrıştırıcısı sunucu sınırlarını uygular; testlerle karşılaştırılır |
| Formda iç içe kaydırma ve dar ekran sütun riski | İç ScrollView kaldırılır; ölçü sütunları dar alanda alta geçer |
| Detay yüklenirken kayıt bulunamadı gösteriliyor | Yükleme, hata ve bulunamadı durumları ayrılır; geri dönüş ve yeniden deneme eklenir |
| Eski ağ isteği yeni ekranın verisini değiştirebilir | Öğrenci detay/eşleşme/talep ekranlarında odak ve istek sırasını kontrol eden ortak hook kullanılır |
| Uygun ve uygun olmayan ilanlar birbirine karışıyor | Varsayılan uygun ilanlar filtresi; tüm ilanlarda nedenler; uygun kayıtlar önce sıralanır |
| Geçersiz ihtiyaç bağlantısı boş eşleşme gibi gösteriliyor | Açık hata ve geri dönüş yolu gösterilir |
| İşletme sayfası form, stok ve talepleri aynı anda gösteriyor | İlanlarım, Gelen talepler, Yeni ilan bölümleri; durum filtreleri ve yenileme |
| İşletme verileri yalnız ilk açılışta yükleniyor | Ekrana dönüşte yeniden yüklenir; geç gelen sonuçlar odak kaybında yok sayılır |
| Aktif talepler geçmiş işlemlerle karışıyor | Öğrenci ve işletme tarafında aktif/geçmiş/tümü filtreleri |
| Talep bir dokunuşta iptal ediliyor | Sonucu açıklayan ekran içi onay ve vazgeçme seçeneği |
| Teslim kodu süresi dolsa da görünmeye devam ediyor | Kod süresi periyodik kontrol edilir; yenileme seçeneği gösterilir |
| Talep işlemleri hızlıca tekrar tetiklenebilir | Öğrenci işleminde eşzamanlı istek kilidi ve devre dışı düğmeler |

## Bilinen ve henüz uygulanmayan ürün eksikleri

- İlan/ ihtiyaç düzenleme, arşivleme ve silme: mevcut sunucu sözleşmesinde yok.
  Durum ve stok kurallarıyla birlikte tasarlanmalı; yalnız UI düğmesi eklemek yeterli değil.
- Ayrı ilan detay ekranı, ilan açıklaması ve fotoğraflar için veri modeli genişlemesi.
- Teslim yeri, saat aralığı ve taraflar arasında iletişim bilgisi paylaşımı için ürün kararı.
- İhtiyaç tarihi ile son teslim alma tarihi arasındaki iş kuralının netleştirilmesi.
  Şimdilik var olan sunucu uygunluk koşulları korunur.
- Şehir/ilçe alanlarının serbest metin yerine ortak veri üzerinden seçimi.
- Çok sayıda kayıt için sunucuda arama, filtreleme, sayfalama ve sanallaştırılmış listeler.
  Bu sürümün filtreleri yüklenmiş kayıtlar üzerinde çalışır.
- Taslak formun kalıcı saklanması ve kaydetmeden ayrılma uyarısı.
- İşletme başvuruları ve yönetici onay arayüzü.

Bu liste tamamlanmış özellik listesi değildir; sonraki ürün geliştirmelerinin
koda bakılarak saptanmış kapsamıdır. Canlı veri veya kullanıcılar silinmez.

## Doğrulama

- TypeScript ve Expo lint çalıştırıldı.
- 20 servis/veritabanı testi geçti; form sınırları, takvim doğrulaması ve
  uygun ilanların sıralaması için regresyon testleri eklendi.
- Yerel ve ayrı bir demo web paketinde: boş form hataları, alanları düzeltip
  kaydetme, detay, uygun ilan, talep gönderme, iptal onayından vazgeçme,
  işletme tarafında talebi görme ve onaylama tarayıcı üzerinden denendi.
- Android emülatöründe açık uygulamanın genel görünümü incelendi. Oturum açılmış
  öğrenci/işletme kabulü emülatörde veya fiziksel telefonda tamamlanmadı.
- Canlı Supabase'de yeni hesap veya deneme kaydı oluşturulmadı.
