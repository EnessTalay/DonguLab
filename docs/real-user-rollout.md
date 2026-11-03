# Gerçek kullanıcı akışı

Uygulama artık varsayılan olarak Supabase kullanır. `.env` içindeki mevcut canlı
bağlantı korunur. Yerel demo yalnız `EXPO_PUBLIC_DATA_MODE=demo` açıkça seçilirse
çalışır. Örnek kayıtlar veya mevcut kullanıcılar silinmez.

## Öğrenci kaydı

Giriş ekranından yeni öğrenci hesabı oluşturulabilir. Parola en az 8 karakterdir;
sunucudaki daha güçlü parola kuralları ayrıca uygulanır. E-posta onayı açıksa
kullanıcı e-postadaki bağlantıyı açtıktan sonra uygulamaya dönüp giriş yapar.
Kayıtta rol gönderilmez; mevcut veritabanı tetikleyicisi öğrenci profili oluşturur.

Supabase Dashboard'da Email sağlayıcısı ve yeni kullanıcı kaydı açık olmalıdır.
Auth URL Configuration > Site URL gerçek, erişilebilir uygulama adresi olmalıdır.
Bu sürüm onay bağlantısından otomatik mobil oturum açmaz; onay sonrası parola ile
giriş yapılır. Genel kullanıma açmadan önce kendi SMTP sağlayıcınızı yapılandırın
ve ekip dışı bir e-posta adresine onay e-postasının ulaştığını doğrulayın.
Dashboard ve SMTP ayarları bu değişiklikte otomatik güncellenmedi.

## İşletme onayı

Kullanıcının seçtiği model: işletmeleri ekip onaylar. Uygulama işletme rolünü
kendi başına alamaz. İşletme yetkilisi önce kayıt olur ve e-postasını doğrular.
Ekip işletmeyi doğruladıktan sonra Supabase SQL Editor'de ilgili hesabın UUID'sini
kullanarak aşağıdaki işlemi yönetici olarak çalıştırır:

```sql
update public.profiles
set role = 'business', display_name = 'Doğrulanmış işletme adı'
where id = 'AUTH_USERS_EKRANINDAKI_KULLANICI_UUID';
```

Hesap çıkış yapıp yeniden giriş yapınca işletme ekranına erişir. Bir işletmeye
çevirmeden önce hesabın öğrenci ihtiyaç/talep geçmişini kontrol edin; rol değişimi
mevcut öğrenci ekranlarına erişimi kapatır. Uygulama içi başvuru veya yönetici
onay paneli henüz yoktur; onay ekip tarafından Dashboard üzerinden yürütülür.

## Yayın ve kabul

Ana ekran kullanıcı akışlarını gösterir; altyapı test ekranı yalnız geliştirme
çalıştırmalarında erişilebilir. Yayın derlemesinde rota da korunur.

İki gerçek hesapla öğrenci kaydı/onayı, işletme yetkisi, ilan, ihtiyaç, talep,
onay, teslim kodu ve teslim sonrası stok kontrolünü iki ayrı cihazda deneyin.
Bu değişiklik canlı e-posta göndererek kullanıcı oluşturmaz ve canlı verileri silmez.

Kaynak: https://supabase.com/docs/guides/auth/passwords
