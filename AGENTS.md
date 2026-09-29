<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Velis — proje özeti (her yeni oturum önce burayı okusun)

Bu repo **Velis** — sigara içme isteği geldiği an için tasarlanmış, sakinleştirici
bir ritüel uygulaması. iOS'ta App Store'da **yayında** ("Velis - Ritual",
bundle `com.forsvelis.app`). Kurucular Zeynep Su Yavuz ve kardeşi, iki
kişilik ekip. Bu dosyayı hangi makineden açarsan aç (farklı Mac, farklı
Claude oturumu) önce burayı oku — geçmiş konuşmalar/hafıza makineler arası
paylaşılmıyor, tek ortak nokta bu repo.

## Mimari

- **`app/`** — Next.js (App Router). `output: 'export'` sadece
  `CAPACITOR_BUILD=1` modunda aktif (bkz. `next.config.ts`); normal web
  dev/deploy bundan etkilenmiyor.
- **`ios/`** — Capacitor 8.5 ile iOS paketleme. `App.xcodeproj` build
  numarası (`CURRENT_PROJECT_VERSION`) her App Store yüklemesinde artırılır.
- **`server/`** — Express 4 + JWT + Mongoose 8 backend, ayrı bir Node
  projesi. Render'da `velis-api` servisi olarak deploy.
- **`docs/`** — GitHub Pages'te yayınlanan Gizlilik Politikası / Kullanım
  Şartları / destek sayfası (`legalDocuments.ts`'ten script ile üretiliyor,
  elle düzenlenmez).

Build: `npm run build:capacitor` = statik export + `cap sync ios`. iOS API
adresi (`NEXT_PUBLIC_API_BASE_URL`) build zamanında gömülüyor.

## Altyapı ve secrets — DEĞER YOK, sadece NEREDE olduğu

- **Backend hosting**: Render, servis adı `velis-api`, Starter plan (soğuk
  başlangıç yok). Ortam değişkenleri Render Dashboard → velis-api →
  Environment'ta. Yerelde çalıştırmak için `server/.env` (repo'da YOK,
  gitignored) — gerekiyorsa elden/güvenli kanaldan alınmalı, mesaj/commit'e
  asla yazılmaz.
- **Veritabanı**: MongoDB Atlas, ücretsiz M0 cluster, db adı `puffless`.
  Uygulama en az yetkili bir DB kullanıcısıyla bağlanıyor (admin kullanıcı
  değil).
- **E-posta**: SendGrid, gönderen `contact@forsvelis.com`.
- **Apple**: Developer Program, bireysel hesap. Otomatik imzalama.
- Bir secret bir kez sohbete/screenshot'a/commit'e düştüyse **döndürülmüş**
  sayılmalı — tekrar kullanma, yenisini iste.

## Kritik teknik ders — WKWebView'de zamanlayıcı kullanma

İki App Store reddinin de kök nedeni buydu: WKWebView, uygulama ön planda
değilken `setTimeout`'ları düşürür/erteler. **UI geçişlerini asla
`setTimeout`'a bağlama** — özellikle tam ekran (`position:fixed;inset:0`)
katmanların kapanmasını. Senkron `onContinue()` / idempotent `doneRef`
guard deseni kullanılıyor (bkz. `app/WelcomeScreen.tsx`,
`app/guide/GuideOverlay.tsx`). Yeni bir onboarding/geçiş ekranı eklerken bu
deseni koru.

## Durum (2026-09-29)

- App Store'da **yayında ve onaylı**, ama kod turu **2026-09-18'de tekrar
  başladı** ve devam ediyor — Velis 1.1 hazırlığı sürüyor. Aşağıdaki "1.1'de
  eklenenler" henüz App Store'a yüklenmedi (bkz. Sürüm numaraları).
- Güvenlik sertleştirme (helmet, rate-limit, mongo-sanitize, admin gate,
  stats anti-cheat) yapıldı ve prod'da; SendGrid + MongoDB şifreleri
  rotate edildi.

## 1.1'de eklenenler (main'de, App Store'a henüz yüklenmedi)

- **Profil fotoğrafı**: Profil sayfasında (sol üst kalem) ve Ayarlar >
  Hesap'ta ekle/değiştir/kaldır. İstemci 320x320 JPEG'e kırpıp küçültüyor,
  sunucu MongoDB'de saklıyor (`User.avatarData`, `select:false`). Profil
  başlığında ve tüm leaderboard'da görünüyor.
- **Moderasyon (App Store 1.2 gereği)**: leaderboard'daki bir kullanıcıyı
  bildirme/engelleme (bkz. `server/src/controllers/moderationController.js`,
  `app/ModerationSheet.tsx`). Bir fotoğraf 3 farklı kişiden bildirim alınca
  otomatik gizleniyor; bildirimler `MODERATION_EMAIL`'e (yoksa
  contact@forsvelis.com) anında e-postalanıyor. Gizlilik Politikası ve
  Kullanım Şartları buna göre güncellendi.
- **Görünen ad artık benzersiz** (büyük/küçük harf ve fazla boşluk
  yok sayılarak karşılaştırılıyor) — leaderboard'da kimlik taklidini önlemek
  için (bkz. `authController.js` `isNameTaken`).
- **"Aysun Yavuz" senkron hatası düzeltildi**: JWT süresi 7 günden 1 yıla
  çıkarıldı (`authController.js` `signToken`); token süresi dolunca artık
  sessizce başarısız olmuyor — ilgili ekranda şifre isteyip **yerel
  ilerlemeyi silmeden** yeniden bağlanan bir akış var
  (`app/SessionExpiredNotice.tsx`, `AuthService.reauthenticate`,
  `mergeStatsPreferringMoreAdvanced`). Kök sebep: token bitince arka plan
  senkronu (`journey.ts` `syncStatsToServer`, best-effort) sessizce
  başarısız oluyordu — cihaz ilerliyor, sunucu/leaderboard eski günde donuk
  kalıyordu.
- **Leaderboard canlı**: ekran açıkken 12 saniyede bir kendiliğinden
  yenileniyor, uygulama öne dönünce anında (bkz. `app/leaderboard/page.tsx`).
  Kendi satırın artık gerçek sırandaki yerinde (eskiden her zaman en altta
  sabitti).

## Sürüm numaraları — TUTARSIZ, 1.1 öncesi netleştirilmeli

- iOS gerçek build: `MARKETING_VERSION 1.0`, `CURRENT_PROJECT_VERSION 6`
  (bkz. `ios/App/App.xcodeproj/project.pbxproj`).
- Uygulama içi "Hakkında" ekranı (`app/constants/version.ts`): hâlâ
  `0.1 Alpha`, Build `1` — App Store'daki gerçek build ile UYUŞMUYOR,
  unutulmuş görünüyor.
- `package.json` version: `0.1.0` (Next.js projesinin kendi meta verisi,
  App Store'a yansımıyor, düşük öncelik).

## Bilinen bekleyen işler (backlog)

- TR App Store lokalizasyonu (şu an sadece İngilizce liste)
- iPad desteği + testi (şu an iPhone-only, `TARGETED_DEVICE_FAMILY=1`)
- Leaderboard/istatistik doğrulamasını tamamen sunucu tarafına taşımak
  (şu an client hesaplıyor, sunucu sadece mantık dışı sıçramaları reddediyor)
- Atlas otomatik yedekleme (M0'da yok), Render + Atlas harcama uyarıları
- App Store Connect → App Privacy'ye "Fotoğraflar" veri türünün eklenmesi
  (kod tarafı hazır, panel işlemi bekliyor)
- `server/`de nodemailer 9.1.1 → 10.x güvenlik güncellemesi (moderate,
  kırıcı değişiklik — mail gönderimi test edilmeden yükseltilmedi)

## Çalışma tarzı notu

Kullanıcı onayları önceden veriyor — evet/hayır sormadan, mantıklı ve
tersine çevrilebilir değişiklikleri doğrudan uygula. Yapının değişmesi
gereken (mimariyi etkileyen) kararlarda önce sor.
