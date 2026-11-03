# DöngüLab veritabanı

Adım adım kurulum: [docs/supabase-setup.md](../docs/supabase-setup.md).

1. Yeni projede migrations/202611030001_core.sql çalıştırılır.
2. İki doğrulanmış Auth hesabı Dashboard üzerinden oluşturulur.
3. Yönetici seed.sql çalıştırır (hesaplara rol atar, örnek ilan/ihtiyaç ekler).
4. pg_cron etkinleştirilir; setup-cron.sql çalıştırılır.
5. Uygulama .env dosyası supabase moduna alınır, Expo yeniden başlatılır.

Yerel demo için bu adımlar gerekmez. Testler gerçek migration'ı PGlite üzerinde
çalıştırır; bu gerçek Supabase Auth/HTTP ve cron testi değildir.
