# Uygulama mimarisi

Paket 2 sonrası güncel yapı. Geçmiş teslim kayıtları `enes-handoff.md`,
`verification.md`, `merge-notes.md` ve `live-supabase-verification.md` dosyalarıdır.
Eksik haritasının başlangıç hali `package-1-baseline.md` içindedir.

## Katmanlar

```text
Expo Router girişleri (src/app)
  → özellik ekranları (src/features)
    → özellik bileşenleri ve hook'ları
      → ortak AppServices sözleşmesi
        → Supabase Auth / tablo okumaları / RPC
        → veya açıkça seçilen bellek içi demo adaptörü
```

Ekranlarda doğrudan Supabase sorgusu yazılmaz. Sunucuya yazma işlemleri
`app_command` RPC'sinden geçer. Rol ve kayıt sahipliği istemci girdisine bırakılmaz.

## Rotalar ve sunum

`src/app` içindeki ürün dosyaları yalnız özellik ekranını dışa aktarır. `_layout.tsx`
dosyaları navigator ve rol korumalarını kurar. Mevcut rota adresleri korunur.

`ScreenFrame` oturum veya router bilmeyen sunum kabuğudur. `AppNavigation`
oturum/aktif rota bilgisini kullanır. `Screen` bu iki parçayı birleştiren kısa
uyumluluk girişidir; ortak stilleri `theme/screen-styles.ts` üzerinden dışa aktarır.

Alanlar `InputField`, ana eylemler `ActionButton`, kartlar `Card`, durumlar
`StatusBadge`, filtreler `ChoiceChips` ile paylaşılır. Renkler `theme/tokens.ts`,
malzeme/durum metinleri `lib/labels.ts` içindedir. Özel ekran yerleşimleri kendi
özellik dizininde kalır; tasarımın tamamlanması Paket 9 kapsamındadır.

## İşletme özelliği

- `BusinessScreen.tsx`: bölüm seçimi, metrikler ve alt bileşenlerin bileşimi.
- `use-business.ts`: bölüm/filtre durumu ve alt hook'ların bileşimi.
- `use-business-resources.ts`: ortak resource hook'u ile ilan/talep yükleme;
  iki listenin yenileme sonuçlarını ayrı ayrı bildirir.
- `use-listing-form.ts`: form durumu, tarih seçimi, gönderim ve yenileme sonucu.
- `listing-form.ts`: saf girdi ayrıştırma, alan mesajları ve form tipleri.
- `use-business-requests.ts`: onay, ret, teslim komutları ve işlem mesajları.
- `components/`: ListingForm, PickupDateField, ListingList, IncomingRequests,
  DeliveryConfirmation. Yalnız kullandıkları model alanlarını prop olarak alırlar.
- `styles.ts` ve `errors.ts`: işletmeye özgü sunum ve bağlamsal hata metinleri.

Form hook'u ekran seviyesinde yaşar; Yeni ilan ile diğer bölümler arasında
geçiş form durumunu kaybettirmez. Başarılı kayıt sonrası liste yenilenemezse
yeniden ilan oluşturulması engellenir; kullanıcı listeyi yeniden yükleyebilir.

## Öğrenci özelliği

Ekranlar `features/student/screens` içindedir. NeedForm ve saf `need-form.ts`
formu yönetir. `matching.ts` çalışan uygunluk/sıralama motorudur.
`service.ts`, ortak servisin öğrenciye yönelik liste/detay/etiket wrapper'ıdır.
`types.ts` yalnız kullanılan form tiplerini içerir.

## Veri yükleme

Genel bakış, öğrenci listesi/detayı/eşleşmeleri/talepleri ve işletme listeleri
`useFocusedResource` kullanır. Yükleyici `useCallback` ile sabitlenir.

- Odakta yükler; `data`, `loading`, `error` ve `reload` sağlar.
- Yeni istek eski isteği geçersiz kılar; odak kaybından sonra veri yazılmaz.
- Yenileme başarılıysa true, hata/odak kaybında false döner.
- Mutasyonun başarı durumu ile sonraki liste yenilemesi ayrı değerlendirilir.
- Oturum başlangıcı ve geliştirici Workbench kendi özel yaşam döngülerini korur.

## Ortak veri ve sunucu

`types/domain.ts` ve `services/contracts.ts` alan/sözleşme kaynağıdır.
`services/index.ts` adaptör seçer; varsayılan Supabase'dir. Demo yalnız açıkça
seçilirse kullanılır. Demo verileri `fixtures/demo.ts` içinde tutulur.

Tarihler `YYYY-MM-DD`, ölçüler mm, miktarlar adettir. `lib/dates.ts` İstanbul
gününü ve takvim doğrulamasını; `lib/numbers.ts` ondalık ayrıştırmayı sağlar.
`services/validation.ts` işlem kurallarını uygulamaya devam eder; tarih
fonksiyonlarının eski dışa aktarımlarını uyumluluk için korur.

Supabase tarafında profiles, listings, needs, requests ve deliveries tabloları;
RLS, app_command, list_request_views ve refresh_reservations bulunur. Stok
değişimleri atomiktir. Yeni profil öğrenci olur; işletme rolü yönetici tarafından atanır.

Paket 2 yeni alan, migration, bağımlılık veya iş kuralı eklemez. Düzenleme,
arşivleme ve ilan kapatma işlemleri sonraki paketlerin kapsamıdır.
