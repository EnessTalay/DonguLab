# Eşleştirme konumu

Çalışan motor `src/features/student/matching.ts` içindedir:
`matchListing` açıklamalı uygunluğu, `rankMatches` uygun kayıtları önceleyen
sıralamayı sağlar. Öğrenci ekranı `features/student/service.ts` üzerinden kullanır.

Sunucudaki işlem uygunluğu ayrıca `services/validation.ts` ve SQL migration'da
denetlenir. Bu klasör eski ekip planındaki yer tutucudur; ikinci motor eklemeyin.
