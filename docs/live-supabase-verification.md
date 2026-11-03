# Canlı Supabase kurulum doğrulaması

> Tarihsel teslim/inceleme kaydıdır. Güncel kod yapısı için [mimari](architecture.md),
> mevcut sözleşme için [servis belgesi](service-contract.md), değişiklikler için
> [Paket 2](package-2-structure.md) esas alınmalıdır. Aşağıdaki test sonuçları kendi dönemine aittir.

3 Kasım 2026 tarihinde `wtvsppqiimzlrsbgraas` projesine kurulum uygulandı.
Bu belge önceki teslimdeki "canlı proje henüz yok" notunun devamıdır.

## Kurulanlar

- `202611030001_core.sql` migration'ı boş veritabanında transaction içinde SQL
  Editor üzerinden çalıştırıldı. Beş uygulama tablosunda da RLS açık.
- İki e-posta onaylı test hesabı kullanıcı onayıyla oluşturuldu. Seed ile öğrenci /
  işletme rolleri ve dört örnek ilan/bir örnek ihtiyaç eklendi.
- pg_cron etkinleştirildi; `dongulab-expire-reservations` her dakika çalışıyor.
  `cron.job_run_details` üzerinde son çalışma sonucu `succeeded` olarak görüldü.
- Bu bilgisayarın Git'e alınmayan `.env` dosyası gerçek Supabase moduna ayarlandı.
  Yalnız mevcut publishable anahtar kullanıldı; service-role anahtarı alınmadı.
- Hesapların rastgele güçlü parolaları yalnız yerel `.env.demo-accounts` dosyasında.
  Bu dosya ve `.env` Git tarafından dışlanır; repoya veya ekip mesajına eklenmez.

SQL Editor üzerinden yapılan kurulum CLI migration geçmişine otomatik kayıt
eklemez. Bu projede aynı ilk migration'ı yeniden çalıştırmayın; ileride CLI ile
yönetilecekse mevcut şemayla migration geçmişini önce eşitleyin.

## Gerçek sunucuda geçen kontroller

1. Öğrenci/işletme girişleri ve sunucudan okunan roller.
2. Ayrı oturumlar arasında ilan/istek görünürlüğü, ilan ve ihtiyaç oluşturma.
3. Tekrarlanan talebin aynı kaydı döndürmesi; onayın stoğu yalnız bir kez ayırması.
4. Öğrencinin işletme onayını çalıştıramaması.
5. Kod yenilemenin eski kodu geçersiz kılması, doğru kodla tek teslim.
6. İşletmenin kod hash'lerini okuyamaması; öğrencinin rolünü yükseltememesi.
7. Tekrarlanan teslimin ikinci stok düşümüne yol açmaması.
8. İptalin ayrılmış stoğu yalnız bir kez serbest bırakması.
9. Anonim istemcinin uygulama tablolarını okuyamaması.
10. Gerçek eşzamanlı HTTP onayları: 5 adet stok için iki ayrı 3 adetlik talebin
    yalnız biri onaylandı; diğeri OUT_OF_STOCK aldı. Test sonunda onay iptal edilip
    bekleyen talep reddedildi; ayrılmış stok sıfırlandı.
11. Tarayıcıdaki uygulamanın gerçek giriş yapması, sunucu kayıtlarını göstermesi
    ve tam sayfa yenilemeden sonra oturumu/verileri koruması.

Canlı doğrulama için açıkça adlandırılmış ek test ilanları/ihtiyaçları ve tamamlanmış
veya iptal/reddedilmiş talepler bırakıldı. İlk dört örnek ilan korunuyor; son
kontrolde toplam ayrılmış stok 0. Testler için yeni kullanıcı oluşturulmadı.

## Kalan entegrasyon

Fiziksel Android/iOS oturum geri yüklemesi ve iki fiziksel cihaz kabulü henüz
yapılmadı. Diğer ekip üyelerinin ekranları ve eşleştirme kodu geldiğinde
`docs/enes-handoff.md` içindeki servis bağlantı adımları uygulanacak.
