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
- **Push bildirimleri (APNs)**: doğrudan Apple'a (FCM/Firebase YOK), bkz.
  "Bildirimler" bölümü. Render Dashboard → velis-api → Environment'ta 3
  değişken: `APNS_KEY` (.p8 dosyasının tam içeriği), `APNS_KEY_ID`,
  `APNS_TEAM_ID` - üçü de yoksa `server/src/lib/apn.js` sessizce no-op olur.
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

## Bildirimler

Native (sistem) bildirimleri - uygulama içi banner DEĞİL, telefonun
bildirim merkezine düşen, kapalıyken bile tetiklenen gerçek bildirimler.
**Faz 2 mimarisi aktif** (Faz 1'deki tamamen cihaz-yerel/kullanıcı
saat-seçimli sürüm terk edildi - kullanıcı HİÇBİR saat/tür seçmiyor, tek
bir "Bildirimler" açma/kapama var, bkz. 2026-10-03 kararı).

- **Mimari**: SUNUCU karar veriyor, cihaz sadece gösteriyor. İstemci
  (`app/services/notifications/`) SADECE: (1) sistem iznini isteyip push
  device token'ını alır, (2) token'ı sunucuya yazar (`PATCH /api/auth/
  preferences`, bkz. `authController.js` `updatePreferences`), (3)
  bildirime tıklanınca doğru ekrana yönlendirir (`deepLink.ts`). Zamanlama
  ve İÇERİK tamamen `server/src/jobs/pushReminderJob.js`'te - istemcide
  artık metin havuzu/saat/sessiz-saat mantığı YOK.
- **Gönderim**: doğrudan APNs (`@parse/node-apn`, bkz. `server/src/lib/
  apn.js`) - FCM/Firebase kullanılmıyor (sadece iOS hedefli olduğumuz için
  gereksiz ekstra altyapı). 3 ortam değişkeni eksikse (bkz. "Altyapı ve
  secrets") modül sessizce no-op olur, job hata vermez.
- **Sabit program**: her gün TR saatiyle (UTC+3, sabit ofset, DST yok)
  **09:00 / 15:00 / 21:00** - `pushReminderJob.js`'teki `SLOT_HOURS`. Gece
  00:00-07:00 hiç bildirim yok (zaten bu 3 slotun dışında kaldığı için ayrı
  bir "sessiz saat" kontrolü gerekmiyor). Kullanıcı bu saatleri
  DEĞİŞTİREMİYOR - kasıtlı bir ürün kararı ("kullanıcıyı uğraştırma").
- **2 tür**: `ritualReminder` (o slotta kullanıcı GÜNÜN ritüelini henüz
  yapmadıysa gönderilir, `User.stats.journeyTimestamp`'e bakarak TR
  gününe göre hesaplanır), `milestone` (seri `MILESTONE_DAYS` = [1,3,7,14,
  30,90]'a ulaşınca - aynı milestone'ın bir daha gönderilmemesi
  `User.lastMilestoneNotified` ile garanti ediliyor). Aynı slotta bir
  kullanıcıya milestone VE reminder birlikte gönderilmiyor (milestone
  öncelikli). "Zor an" (craving saatleri) ve "nazik check-in" türleri
  KALDIRILDI (kullanıcıdan saat istemeleri "hiçbir şey seçmesin" kuralıyla
  çelişiyordu; check-in zaten 3 sabit slotun kendisiyle fiilen karşılanıyor
  - ritüel yapılmadığı sürece zaten her slotta hatırlatma gidiyor).
- **Ton kuralları (ASLA ihlal edilmez)**: suçlayıcı/baskıcı/utandırıcı
  hiçbir ifade yok ("Yine mi kaçırdın?" tarzı cümleler YASAK). Her tür için
  TR/EN metin havuzu artık SUNUCUDA (`server/src/lib/notificationCopy.js`),
  rastgele seçiliyor. Yeni bir metin eklerken bu kural geçerli.
- **İzin akışı**: ilk açılışta SORULMUYOR. İlk ritüel tamamlanıp
  aftercare'in sonunda kendi "soft-ask" ekranımız (`aftercare/
  NotificationSoftAsk.tsx`) gösteriliyor; kullanıcı orada "evet" demeden
  gerçek iOS sistem izni (`requestPermissions()`) HİÇ tetiklenmiyor - iOS
  bir uygulamaya izni tekrar sorma hakkı tanımadığı için bu sıra kritik.
  Soft-ask, ilk ritüelden hemen sonra (henüz hesap/JWT yok) gösterildiği
  için alınan push token'ı `app/services/notifications/store.ts`
  `pendingPushToken` ile bekletip bir JWT ortaya çıkar çıkmaz (her app
  açılışında, bkz. `NotificationsBoot.tsx`) sunucuya gönderiyor. Sistem
  düzeyinde kalıcı reddedilmişse `openSystemSettings()` ile
  `app-settings:` üzerinden doğrudan iOS Ayarlar'a yönlendiriliyor.
- **Deep link haritası**: `ritualReminder` → `/` (ritüel ekranı),
  `milestone` → `/journey` (ya da ödül günüyse `/reward?day=N`). Tıklama,
  ön plan/arka plan/kapalı HER ÜÇ durumda da `deepLink.ts`'teki tek
  `pushNotificationActionPerformed` listener'ından geçiyor - gerçek bir URL
  scheme/universal link YOK, sunucunun push payload'ına koyduğu `target`
  alanına göre saf istemci tarafı `router.push`.
- **Aktifleştirmek için insan eli gereken 3 adım** (hiçbiri kod değil,
  AGENTS/Claude bunları yapamaz):
  1. Apple Developer portal → Certificates/Identifiers/Profiles →
     Identifiers → `com.forsvelis.app` → **Push Notifications**
     capability'sini aç; Keys → yeni bir **APNs Auth Key (.p8)** oluştur,
     Key ID'yi not al (Team ID zaten hesapta görünür).
  2. Xcode'da `App` target → Signing & Capabilities → **+ Capability →
     Push Notifications** (bu, entitlements dosyasını ve provisioning
     profilini otomatik imzalama ile kendisi halleder - elle pbxproj
     düzenlenmiyor).
  3. Render Dashboard → velis-api → Environment'a `APNS_KEY` (.p8 dosyasının
     TAM içeriği), `APNS_KEY_ID`, `APNS_TEAM_ID` eklenir.
- **Android**: şu an `android/` projesi YOK (sadece iOS hedefleniyor,
  `cap add android` hiç çalıştırılmadı).
- Mevcut `dailyRitualReminder` (Ayarlar > Bildirimler ilk satır) bu
  sistemden AYRI - o, `server/src/jobs/cooldownReminder.js`'in attığı bir
  E-POSTA hatırlatması, native push ile karıştırılmamalı.

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
