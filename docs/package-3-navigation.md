# Paket 3 — Gezinme ve ekran durumları

Başlangıç: Paket 2 / `edf6364`. Dal: `codex/package-3-navigation`.
Tarih: 3 Kasım 2026.

## Gezinme kararı

Eski alt menü `router.navigate` ile aynı Stack içinde ekran ekliyordu. Ana
sayfada eski forma giden geri oku ve birbirine karışan bölüm geçmişleri oluşabiliyordu.

Artık `expo-router/js-tabs` ile gerçek sekmeler kullanılır:

- Öğrenci: Genel bakış / İhtiyaçlarım / Taleplerim.
- İşletme: Genel bakış / İşletmem.
- Oturumsuz: tanıtım ve giriş; alt menü gösterilmez.
- Rol değişince korumalı sekmeler navigator'dan çıkarılır; sunucu yetkileri aynıdır.

Kök Stack `(main)`, giriş, bulunamadı ve geliştirici araçlarını taşır.
`(main)/(needs)` ihtiyaç listesi, form, detay ve eşleşme Stack'idir.
`(main)/(requests)` Taleplerim için ayrı Stack'tir. Gruplar URL'ye zorunlu
segment eklemez: `/`, `/student`, `/student/new-need`, `/student/needs/[id]`,
`/student/matches/[needId]`, `/student/requests` ve `/business` korunur.

Sekmelerin geri davranışı başlangıç sekmesi Genel bakışa göre tanımlıdır.
Ana sekme başlıklarında geri oku yoktur. Detay başlıklarındaki BackButton,
geçmiş varsa geri gider; yoksa güvenli liste/ana sayfa adresine döner.
İhtiyaç Stack'inin başlangıç ekranı açıkça tanımlanmıştır.

## İşlem sonrası akış

- Yeni ihtiyaç kaydı formun yerini detayla değiştirir; kaydedildi mesajı gösterilir.
  Geri, tamamlanmış forma değil ihtiyaç listesine gider.
- Eşleşmeden talep gönderilince ihtiyaç kolu detaya döner ve Taleplerim sekmesi açılır.
  Başarı mesajı yalnız yüklenen listede ilgili talep bulunduğunda gösterilir.
- Başarı mesajı kapatılabilir; yeni talep geldiğinde aktif filtre kullanılır.
- Sekmeler arasında geçiş formun yerel değerlerini ve detay konumunu korur.
  Kalıcı taslak ve kaydetmeden ayrılma uyarısı Paket 5'e aittir.

## Ekran durumları ve eylemler

`StatePanel` yüklenme, hata, boş, bulunamadı ve başarı sunumunu ortaklaştırır.
`Feedback` eski tüketiciler için bu bileşeni kullanır. Resource hook'u AppError
kodunu ayrıca döndürür; NOT_FOUND, bağlantı/işlem hatasından ayrılır.

| Durum | Devam yolu |
| --- | --- |
| Yüklenme | İşlemin adı ve bekleme göstergesi; boş kayıt mesajı gösterilmez |
| Liste hatası | Mesaj ve Yeniden dene |
| İhtiyaç araması boş | Aramayı temizle |
| İhtiyaç listesi boş | Yeni ihtiyaç oluştur |
| Uygun ilan yok | Tüm ilan nedenlerini incele veya ihtiyaç listesine dön |
| Talep bölümü boş | İhtiyaçları incele |
| İşletme ilanı yok | Yeni ilan bölümünü aç |
| İlan/talep filtresi boş | Tüm kayıtları göster |
| Kayıt bulunamadı | Açık durum mesajı, yeniden deneme ve listeye dönüş |
| Geçersiz URL | Ortak +not-found ekranı ve Genel bakışa dön |

## Mobil yerleşim

- Klavye ve kaydırma tek ScreenFrame ScrollView üzerinden yönetilir;
  iç içe KeyboardAvoidingView katmanları kaldırıldı.
- iOS için automaticallyAdjustKeyboardInsets; sürüklemede klavye kapatma ve
  keyboardShouldPersistTaps uygulanır. Android Expo varsayılan resize davranışını kullanır.
- Sekme çubuğu klavye açıkken gizlenir; safe area sekme çubuğuyla iki kez eklenmez.
- 360 piksel altındaki ekranlarda yatay boşluk ve başlık boyutu azaltılır.
- İşletme ölçü alanları dar alanda alt alta geçer; dokunma alanları korunur.
- Alt menü navigator'ın seçili sekme, erişilebilirlik etiketi ve tabPress davranışını kullanır.

## Doğrulama kaydı

- TypeScript, Expo lint ve 22 mevcut servis/SQL/saf kural testi çalıştırıldı.
- Ayrı demo web paketinde öğrenci/işletme girişleri ve rol değişimindeki sekmeler kontrol edildi.
- Genel bakışta gereksiz geri oku olmadığı, sekme değişiminde form değerlerinin
  korunduğu ve boş talep eyleminin İhtiyaçlarım'a geçtiği görüldü.
- Boş arama → aramayı temizle; boş işletme filtresi → tüm ilanlar eylemleri kontrol edildi.
- Kaydet → başarı/detay → geri ile liste; liste → detay → eşleşme → talep →
  başarı/Taleplerim; İhtiyaçlarım'a dönüşte detayın kalması doğrulandı.
- İşletme sekmesinden tarayıcı geri ile Genel bakışa dönüldü; eski öğrenci formu açılmadı.
- 320 × 640 tarayıcı görünümünde işletme alanları alt alta geçti. DOM ölçümünde
  sayfa genişliği ve scrollWidth 320 idi; alanların sağ sınırı 266 idi, yatay taşma yoktu.
- Son geçersiz URL testi sırasında tarayıcı kontrol bağlantısı kullanılamaz hale geldi;
  +not-found görünümü bu oturumda arayüzden doğrulanamadı. Kod ve derleme kontrolü kapsamındadır.
- Android emülatörü açık değildi. Native klavye, Android donanımsal geri, iOS
  swipe-back ve fiziksel cihaz kabulü tamamlanmadı. Browser boyut testi bunların yerine geçmez.

Bu paket veritabanı şeması, stok/teslim kuralları veya bağımlılık değiştirmez.
Canlı Supabase'de deneme kaydı oluşturulmadı. Sonraki paket: veri modeli ve iş kuralları.
