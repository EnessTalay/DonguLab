# Ekip için ilk teslim: servis sözleşmesi

Kesin tipler `src/services/contracts.ts` içinde. Mevcut `domain.ts` alanları
değişmedi. `demo.ts` içindeki eski örnekler ve `ListingService.list()` geriye
uyumluluk için duruyor; yeni kod `AppServices` kullanmalı.

`createDemoServices(createDemoStore(demoListings, [demoNeed]))` aynı servis
imzalarıyla oturum, kayıt, talep, onay, iptal ve kodla teslimi bellekte çalıştırır.
Demo hesapları `ogrenci@demo.local` / `isletme@demo.local`, parola `Demo123!`.
Bunlar yalnız örnek hesaplardır. Yeniden yükleme verileri siler; başka cihazla
paylaşılmaz; demo adaptörü bir güvenlik sınırı değildir.

İlk başlangıç: Fatmanur ve Canan `AppServices` tipini kullanır; bileşenlerine
servis enjekte edebilir. Enes'in bağlantı tamamlandığında sunacağı `services`
nesnesinde aynı metotlar bulunacak. UI içinde Supabase sorgusu yazmayın.

- `createListing(input)`: id, businessId, quantityReserved girilmez.
- `createNeed(input)`: id, studentId girilmez.
- `createRequest(needId, listingId)`: ihtiyaç miktarı sunucudan alınır.
- `listMyRequests` / `listIncomingRequests`: request, listingTitle, projectName,
  expiresAt içerir; kod veya hash içermez.
- `issueDeliveryCode(requestId)`: açık bir oluştur/yenile eylemidir. Kod yalnız
  bu cevapta öğrenciye verilir; yenisi eskisini iptal eder. Tekrar girişte eski kod
  okunamaz; kullanıcı yenisini üretir. Kod en fazla 10 kez üretilebilir ve 5 yanlış
  deneme limiti yenilemede sıfırlanmaz.
- Hatalar `AppError {code, message}` şeklinde fırlatılır; işlemi başarısızsa UI
  başarı göstermemeli. Talep süresi dolduğunda cancelled olur.

Kurallar: ihtiyacın tamamını tek ilan karşılar. Bir ihtiyaç için aynı anda bir
pending/approved veya tamamlanmış delivered talep bulunabilir. Aynı aktif
talebin tekrar oluşturulması aynı kaydı döndürür; iptal/ret sonrasında yeniden
talep mümkündür. Onayda stok yeniden denetlenir. Rezervasyon 2 saat, ilan ve
ihtiyaç tarihlerinin İstanbul gün sonlarından en erken olanına kadar sürer.
Son tarih ihtiyaç tarihinden önce olsa da bugün teslim mümkünse uygundur.

`services/validation.ts` demo işlemlerinin giriş/uygunluk kontrolüdür, UI için
eşleştirme motoru değildir. Emine `src/matching` fonksiyonlarını geliştirecek;
sıralama/açıklama o modülden gelecek. Enes SQL kurallarıyla pariteyi doğrulayacak.

İlk teslim testi: `node --test tests/service.test.cjs`. İki demo servis istemcisinin
ortak store kullanması, öğrenci/işletme işlemlerini testte ayrı oturumlarla dener.
