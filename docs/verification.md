# Doğrulama notları

> Tarihsel teslim/inceleme kaydıdır. Güncel kod yapısı için [mimari](architecture.md),
> mevcut sözleşme için [servis belgesi](service-contract.md), değişiklikler için
> [Paket 2](package-2-structure.md) esas alınmalıdır. Aşağıdaki test sonuçları kendi dönemine aittir.

3 Kasım 2026, Windows üzerinde Node.js 22.23.4 kullanıldı. Sistem genelindeki
Node.js 20 değiştirilmeden kontroller için ayrı Node.js 22 çalışma zamanı indirildi.

Geçen kontroller: kilit dosyasından temiz `npm ci`, `npm run check`,
`npm run export:web` ve Expo Doctor (21/21). Web dışa aktarımında başlangıç,
öğrenci ve işletme sayfaları üretildi.

GitHub Actions dosyası üç işletim sisteminde kontrol yapacak şekilde hazırlandı;
macOS/Linux ve fiziksel Android/iOS cihaz testleri yerelde yapılmadı.

`npm audit fix` ile SDK sürümünü bozmadan uygulanabilen güncellemeler uygulandı.
Bağımlılık ağacında 30 audit bildirimi (2 düşük, 23 orta, 5 yüksek) kalıyor;
bunlar Expo/Router ve lint araçlarının geçişli bağımlılıklarını da içeriyor.
`npm audit fix --force`, SDK/Router için uyumsuz ana sürüm değişiklikleri
önerdiğinden uygulanmadı. Üretim yayını öncesinde bu bağımlılıklar yeniden
değerlendirilmeli. Bu depo geliştirme başlangıcıdır.
