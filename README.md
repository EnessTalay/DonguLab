# DöngüLab

İşletmelerin kullanılabilir artık malzemelerini öğrencilerin projeleriyle
buluşturan Expo / React Native uygulaması. Aynı kaynak Android, iOS ve web için
kullanılır. Expo Router, TypeScript ve Supabase üzerine kuruludur.

## Kurulum

Node sürümü `.nvmrc` ve `.node-version` içinde sabittir: **22.23.4**.
`package.json` Node >=22.13 ve <23, npm >=10 ve <12 kabul eder.

```sh
git clone https://github.com/EnessTalay/DonguLab.git
cd DonguLab
npm ci
```

`.env.example` dosyasını `.env` olarak kopyalayın. PowerShell:

```powershell
Copy-Item .env.example .env
```

Ardından iki çalışma biçiminden birini seçin:

| Mod | Ayar | Davranış |
| --- | --- | --- |
| Supabase (varsayılan) | `EXPO_PUBLIC_DATA_MODE=supabase`, proje URL'si ve publishable/anon anahtarı | Gerçek hesap, kalıcı kayıt ve cihazlar arası veri |
| Yerel demo | `EXPO_PUBLIC_DATA_MODE=demo` | Bellekte örnek hesaplar ve kayıtlar; yeniden yüklemede sıfırlanır |

Supabase için [kurulum](docs/supabase-setup.md) ve [kullanıcı/işletme hesabı akışı](docs/real-user-rollout.md)
belgelerini okuyun. Eksik gerçek bağlantı sessizce demoya dönmez. `.env` Git'e
alınmaz; uygulamada yalnız public anahtar kullanılır.

```sh
npm run web
# veya telefon / Expo Go için:
npm start
```

Fiziksel telefon aynı ağda olmalıdır. SDK 57 uyumlu Expo Go gerekir. Native
kütüphane içeren mevcut development build değişirse yeniden derlenmelidir.
Bu depo bağımsız APK/IPA veya mağaza sürümü içermez.

## Mevcut akış

- Öğrenci: kayıt/giriş → ihtiyaç oluştur → uygun ilanlar → talep → işletme onayı → teslim kodu.
- İşletme: yönetici tarafından rol atanmış hesap → ilan oluştur → talebi onayla/reddet → kodla teslim.
- Stok sunucuda atomik işlemlerle yönetilir; istemci sahiplik veya rol belirlemez.
- İlanlar, ihtiyaçlar, talepler, filtreler, hata/boş/yüklenme durumları ve genel bakış ekranları vardır.
- İşletme başvuru paneli, ilan/ihtiyaç düzenleme ve arşivleme, fotoğraf ve bildirimler henüz yoktur.

Yerel demoda Giriş ekranındaki Demo Öğrenci / Demo İşletme düğmeleri kullanılır.
Hesaplar uygulamadan çıkış/giriş yapılarak değiştirilebilir; aynı sayfadaki bellek
deposu korunur. Farklı cihaz veya sekmeyle paylaşılmaz. Demo kayıt açmaz.

## Dosya yapısı

```text
src/app/                    Yalnız rota girişleri ve navigator layout'ları
src/features/auth/          Giriş / öğrenci kaydı ekranı
src/features/home/          Genel bakış ekranı
src/features/student/       Öğrenci ekranları, ihtiyaç formu, matching ve wrapper servis
src/features/business/      İşletme ekranı, form/listeler, kaynak ve işlem hook'ları
src/features/developer/     Yalnız geliştirmede erişilen servis test ekranı
src/components/             Frame, navigasyon, alan, düğme, kart, filtre, durum etiketi
src/hooks/                  Ortak odakta veri yükleme / yeniden deneme
src/lib/                    Ortak tarih, sayı, etiket ve hata yardımcıları
src/theme/                  Renk token'ları ve ortak ekran stilleri
src/fixtures/               Yalnız demo verileri ve demo hesap tanımları
src/services/               AppServices sözleşmesi, oturum, demo/Supabase adaptörleri
src/types/                  Ortak domain tipleri
supabase/                   Migration, yönetici seed'i ve cron kurulumu
tests/                      Node test runner + PGlite servis/SQL testleri
docs/                       Güncel mimari, sözleşme ve tarihli paket kayıtları
```

## Kontroller

| Komut | İşlev |
| --- | --- |
| `npm run check` | TypeScript ve Expo lint |
| `npm test` | Servis, SQL/RLS, form ve saf yardımcı testleri |
| `npm run export:web` | `dist/` içinde statik web çıktısı |
| `npm run doctor` | Expo bağımlılık/yapılandırma teşhisi |

GitHub Actions Windows/macOS/Linux üzerinde kurulum, check, test ve web export
çalıştıracak şekilde tanımlıdır. Yerel test geçmesi, iki fiziksel cihazda veya
canlı e-posta akışında kabul testi yapıldığı anlamına gelmez.

## Geliştirme belgeleri

- [Güncel mimari](docs/architecture.md)
- [Güncel servis sözleşmesi](docs/service-contract.md)
- [Paket 1: başlangıç envanteri ve eksikler](docs/package-1-baseline.md)
- [Paket 2: kod yapısı ve yapılanlar](docs/package-2-structure.md)
- [Önceki canlı altyapı doğrulaması](docs/live-supabase-verification.md) — tarihsel kayıt

Expo API değişikliklerinde [SDK 57 belgelerini](https://docs.expo.dev/versions/v57.0.0/)
ve depodaki `AGENTS.md` kurallarını esas alın. Yeni bağımlılıklar Expo CLI ile
SDK uyumlu kurulmalı; `ios/` ve `android/` elle oluşturulmamalıdır.
