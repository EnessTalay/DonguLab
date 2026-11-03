# Paket 5–6 — Öğrenci ve işletme akışlarının tamamlanması

4 Kasım 2026. Dal: `codex/package-5-6-completion`.
Başlangıç: kullanıcının `dongulab.zip` sürümü, Paket 4 (`b56cbac`) üzerine alındı.
ZIP'teki node_modules, .git, .expo, yerel ortam dosyaları ve pnpm kilidi aktarılmadı.
Proje npm ve mevcut package-lock.json ile devam eder.

## Tamamlanan işler

- ZIP'teki ihtiyaç düzenleme/arşivleme, ilan düzenleme/kapatma, detay ekranları,
  karşılaştırma, filtreler ve ilana bağlı talep akışları ana çalışma alanına taşındı.
- Aynı ilan için talep kontrolü seçilen ihtiyaca bağlandı. Başka bir projenin
  pending/approved/delivered kaydı yeni ihtiyacı engellemez.
- Talep geçmişi yüklenmeden veya geçmiş bulunduğunda öğrenci düzenleme düğmesi
  açılmaz. Sunucu sahiplik/geçmiş kontrolleri korunur.
- ID ile ilan okuma servisi eklendi. Kapanan ilanlar keşifte görünmez, fakat
  öğrencinin geçmiş talep detayındaki ölçü/bölge/teslim talimatı korunur.
- Ret ve iptal gerekçelerinin yerel Map uygulaması kaldırıldı. İlgili tüm ekran
  ve liste işlemleri gerekçeyi RPC'ye gönderir. Sunucu 500 karakter sınırını,
  rol/sahipliği ve durum geçişini kontrol ederek gerekçeyi aynı işlemde kaydeder.
  İşlem başarısızsa gerekçe ve stok değişmez. Tekrar çağrı ilk gerekçeyi korur.
- Liste DTO'ları gerekçeyi iki tarafa da döndürür; ilgisiz hesaplara RLS açılmaz.
  Süre dolumu gerekçesiz cancelled olarak kalır; kullanıcı adına gerekçe yazılmaz.
- Yeni ihtiyaç taslağı mevcut AsyncStorage bağımlılığıyla kullanıcıya özel
  anahtarda saklanır. Açılışta yüklenir; hesap değişiminde form yeniden kurulur.
  Yazma kuyruğu, yavaş otomatik kaydın gönderilmiş/silinmiş taslağı geri
  getirmesini önler. Başarısız sunucu kaydı taslağı silmez; başarı veya açıkça
  vazgeçme taslağı temizler. Saklama hataları kullanıcıya gösterilir.
- Kullanılmayan import ve güncel migration kurulum belgesi düzeltildi.

## Kontroller

- TypeScript ve lint: hatasız, uyarısız.
- Otomatik testler: 44/44 geçti.
- Web export: 42 rota/alias üretildi.
- Ayrı demo web çıktısında tarayıcı üzerinden: taslak yazma → sayfa yenileme →
  aynı hesapla giriş → taslağın geri gelmesi → ihtiyaç kaydı → talep gönderimi →
  ihtiyaç düzenleme düğmesinin kilitlenmesi doğrulandı.
- Öğrenci ve işletme hesapları arasında geçişle: işletme listesinden gerekçeli
  ret detayına gidildi, gerekçe seçilip ret kaydedildi ve öğrenci geçmiş talep
  detayında aynı gerekçenin göründüğü doğrulandı.
- Fiziksel Android/iOS ve canlı veritabanında uçtan uca kabul tamamlanmadı.

Servis ve SQL testlerinde seçilen ihtiyaca göre talep, iki bağımsız istemciye
gerekçe görünürlüğü, yetkisiz/başarısız değişiklikte tutarlılık, tekrarlanan
işlemler, kapanan ilan erişimi, uygulama yeniden açılışını temsil eden yeni
storage örneği, hesap izolasyonu, bozuk veri ve sıralı silme senaryoları yer alır.
PGlite ilk şemadaki onaylı talebi tüm migration'lardan geçirerek teslim ve stok
devamlılığını da denetler. Çok bağlantılı PostgreSQL yük testi değildir.

Canlı veritabanının salt okunur kontrolünde `listings.status` ve gerekçe sütunları
eksik bulundu. Yönetici erişimi bulunmadığından migration canlıya uygulanamadı;
uygulanması gereken sıra **002 → 003 → 004**. Eski tablolar silinmez, stok ve
talepler sıfırlanmaz. Ayrıntılar `supabase-setup.md` içindedir.
