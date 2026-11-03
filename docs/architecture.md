# Geliştirme sözleşmesi

Bu depo uygulamanın başlangıç iskeletidir; aşağıdaki gerçek sunucu akışı henüz
uygulanmamıştır. Planlanan ana akış:

İlan oluştur → ihtiyaç gir → eşleşmeleri gör → talep gönder → işletme onayı →
kodla teslim.

## Platform ve kurulum

- Expo SDK 57, React Native, TypeScript ve Expo Router.
- Node.js 22.23.4, npm ve kilitlenmiş `package-lock.json`.
- İlk geliştirme web ve Expo Go üzerinden yapılır. Yerel native proje klasörleri
  üretilmez; uygulama yapılandırması `app.json` içinde tutulur.
- Gerçek veri katmanı için Supabase Auth ve PostgreSQL planlanır. Mevcut sürüm
  herhangi bir Supabase projesine bağlanmaz.

## Ortak alanlar

Ölçüler mm, miktarlar adet. Uygulama tiplerinde camelCase, ileride PostgreSQL
tablolarında snake_case kullanılabilir; dönüşüm servis katmanında yapılmalı.
Malzeme türleri `wood`, `metal`, `plastic`; arayüzde Türkçe açıklamalar kullanılır.
Kalınlık bilinmiyorsa `null`; kesin uygun eşleşme olarak gösterilmez.
Tarihler `YYYY-MM-DD` biçimindedir; teslim zamanı ve saat dilimi kuralları gerçek
sunucu entegrasyonundan önce netleştirilmelidir.

## Sonraki işler

1. Öğrenci ihtiyaç formu ve işletme ilan formunu ortak tiplerle geliştirin.
2. Eşleştirmede tür, kalınlık, döndürülerek sığma, stok, bölge ve tarihi doğrulayın.
3. Supabase migration, profil/rol ilişkileri ve RLS politikalarını ekleyin.
4. Gerçek oturum ve servisleri bağlayın; öğrenci/işletme sahipliğini sunucuda denetleyin.
5. Talep/onay/iptal/teslim işlemlerini atomik PostgreSQL fonksiyonlarıyla yapın.
   Onayda stok kilidi, tekrar çağrılarda idempotency, süre dolumunda tek seferlik
   rezervasyon serbest bırakma gerekir.
6. Teslim kodunu sunucuda üretip hash ile saklayın; süre, deneme ve tek kullanım
   kontrollerini sunucuda uygulayın.

İlk uçtan uca kabul: iki gerçek hesap/cihaz aynı verileri görür; uygun taleple stok
ayrılır; doğru kod bir kez teslim eder; başka kullanıcının verilerine yetkisiz
erişim ve ikinci stok düşümü engellenir. Bu kabul henüz sağlanmış değildir.
