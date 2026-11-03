# DöngüLab

İşletmelerin kullanılabilir artık malzemelerini öğrencilerin projeleriyle
buluşturan mobil uygulamanın geliştirme başlangıcı. React Native + Expo SDK 57 +
Expo Router + TypeScript; aynı kaynak kod Android, iOS ve web için kullanılır.

## Hızlı kurulum — Windows, macOS, Linux

Gerekenler: Git ve **Node.js 22.23.4** (npm 10 ile gelir). Node sürümü `.nvmrc`
ve `.node-version` içinde sabittir. Node sürüm yöneticisi kullanmıyorsanız
[Node.js resmi dağıtımlarından](https://nodejs.org/dist/v22.23.4/) sisteminize uygun
kurulumu seçin. `node --version` ile kontrol edin. Global Expo kurulumu gerekmez.

```sh
git clone https://github.com/EnessTalay/DonguLab.git
cd DonguLab
npm ci
npm run web
```

Terminalde yazan yerel adresi tarayıcıda açın. Web için Android Studio, Xcode,
Docker, Supabase hesabı veya `.env` dosyası gerekmez. İlk kurulum internet ister.
`npm ci`, depoya eklenen `package-lock.json` üzerinden aynı bağımlılıkları kurar.

## Telefonda açma

```sh
npm start
```

Android/iPhone'a SDK 57 ile uyumlu **Expo Go** kurun. Bilgisayar ve telefonu aynı
Wi-Fi ağına bağlayın, terminaldeki QR kodunu tarayın. iPhone'da Kamera, Android'de
Expo Go kullanılabilir. Windows'tan da fiziksel iPhone'da Expo Go ile denenebilir.
Expo Go sürüm uyuşmazlığında [resmi sürüm sayfasını](https://expo.dev/go) kontrol edin.

Bağlantı kurulamıyorsa güvenlik duvarında Node.js için özel ağ erişimini açın.
Farklı ağlar için `npx expo start --tunnel` kullanılabilir; CLI ek tünel paketinin
kurulumunu isteyebilir. Bu yöntem internet ve üçüncü taraf tünel servisi gerektirir.

`npm run android` kurulu Android emülatörünü, `npm run ios` macOS'taki iOS
simülatörünü açar. Emülatör kullanımı isteğe bağlıdır. Bu repo bağımsız APK/IPA
veya mağaza sürümü içermez; Expo Go geliştirme amaçlıdır.

## Komutlar

| Komut | İşlev |
| --- | --- |
| `npm start` | Expo geliştirme sunucusu |
| `npm run web` | Tarayıcıda geliştirme |
| `npm run check` | TypeScript ve lint kontrolü |
| `npm run export:web` | `dist/` içine statik web çıktısı |
| `npm run doctor` | Expo bağımlılık ve yapılandırma teşhisi |

GitHub Actions, Windows/macOS/Linux üzerinde temiz kurulum, tip/lint kontrolü ve
web dışa aktarımını çalıştıracak şekilde yapılandırılmıştır. Fiziksel telefon
kontrolü ayrıca yapılmalıdır.

## Bu sürümün kapsamı

Hazır: rol seçimi başlangıç ekranı, öğrenci/işletme örnek liste ekranları, ortak
veri tipleri, dört örnek ilan ve bir öğrenci ihtiyacı, örnek servis sözleşmesi.

Henüz yok: Supabase Auth/veritabanı, gerçek yetkilendirme, ihtiyaç/ilan kaydetme,
eşleştirme motoru, talep/onay, atomik stok rezervasyonu ve teslim kodu.
Rol seçimi bir oturum açma işlemi değildir. Örnek veriler salt okunur;
cihazlar arasında veri senkronizasyonu yapılmaz.

## Ekip için dosya yapısı

```text
src/app/                 Expo Router ekranları
src/app/student/         Fatmanur: öğrenci ekranları
src/app/business/        Canan: işletme ekranları
src/components/          Ortak ekran ve görünüm bileşenleri
src/types/domain.ts      Ortak veri sözleşmesi
src/services/demo.ts     Örnek veriler ve servis arayüzü
src/matching/            Emine: eşleştirme geliştirme alanı
docs/                   Mimari ve geliştirme notları
```

Enes: altyapı, kimlik ve gerçek veri servisleri. Mevcut tasarımın uygulama planı
[docs/architecture.md](docs/architecture.md) içinde. Ekipte `package-lock.json`
commitlenmeli; sürüm yükseltmeleri birlikte yapılmalı. Gerçek servisler eklenirken
`.env.example` güncellenmeli. Supabase yönetici anahtarı uygulamaya konmamalı.

Kurulum kaynakları: [Expo proje oluşturma](https://docs.expo.dev/get-started/create-a-project/),
[SDK 57 belgeleri](https://docs.expo.dev/versions/v57.0.0/).
