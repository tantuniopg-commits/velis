const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Report = require('../models/Report')
const { sendPasswordChangedEmail, sendWelcomeEmail } = require('../lib/mailer')
const { isAdminEmail } = require('../lib/admins')

const STATS_FIELDS = ['journeyDay', 'currentStreak', 'journeyTimestamp', 'totalXP', 'totalRitualCount', 'totalRitualTimeSec']

// Gövdeden gelen HER alan önce string'e zorlanıp trim'leniyor - bir saldırgan
// `{"$gt":""}` gibi bir nesne gönderse bile Mongo sorgusuna operatör olarak
// değil, düz (anlamsız) bir string olarak giriyor (express-mongo-sanitize
// zaten `$`/`.` anahtarlarını da temizliyor - bu ikinci savunma katmanı).
function str(v) {
  return typeof v === 'string' ? v.trim() : ''
}
// Görünen ad BENZERSİZ: aynı ada sahip ikinci bir hesap açılamıyor / ad o
// haline getirilemiyor. Karşılaştırma büyük-küçük harf duyarsız (Türkçe
// kurallarıyla: I/ı, İ/i) ve fazla boşluklar tek boşluğa indirilmiş halde -
// "ada  LOVELACE" ile "Ada Lovelace" aynı ad sayılıyor, yoksa liste/sıralamada
// birinin adını taklit etmek çok kolay olurdu. Veritabanı seviyesinde unique
// index YOK (üretimde zaten çift adlar varsa index kurulumu kırılırdı) - bu
// kontrol sadece YENİ almaları engelliyor; iki isteğin aynı anda gelmesi gibi
// nadir bir yarış durumunda ikisi de geçebilir.
function normalizeName(v) {
  return str(v).replace(/\s+/g, ' ').slice(0, MAX_NAME)
}
async function isNameTaken(name, exceptUserId) {
  const filter = { name }
  if (exceptUserId) filter._id = { $ne: exceptUserId }
  return !!(await User.exists(filter).collation({ locale: 'tr', strength: 2 }))
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
function isValidEmail(email) {
  return typeof email === 'string' && email.length <= 254 && EMAIL_RE.test(email)
}
// Sunucu tarafı uzunluk tavanları - şema seviyesinde de olsa buradan net
// hata dönmek daha iyi.
const MAX_NAME = 80
const MAX_GENDER = 32
const MAX_BIRTHDATE = 10 // "YYYY-MM-DD"

// --- Stats anti-cheat ---------------------------------------------------
// Stats KASITLI OLARAK istemcide hesaplanıp senkronlanıyor (mimari bu -
// ritüel mantığı istemcide). Sunucu ritüeli çalıştırmıyor ama gelen
// değerlerin MAKUL olup olmadığına bakıyor: "totalXP = 1 milyar" gibi kaba
// leaderboard hilelerini kesiyor. Gerçekçi hızda sahte ilerleme dripleyen
// sofistike birini durdurmaz - amaç, tek bir POST'la leaderboard'u ele
// geçirmeyi imkansızlaştırmak.
const STATS_CEIL = {
  journeyDay: 100000,
  currentStreak: 100000,
  totalXP: 100000000,
  totalRitualCount: 500000,
  totalRitualTimeSec: 1000000000,
}
// Bir ritüel: XP_PER_RITUAL (10) + amber top bonusu (en fazla ~600) - 1000
// çok cömert bir üst sınır. Ödül günü tek seferlik +500 XP ekliyor, ritüel
// sayısını artırmıyor; taban pay onu da kapsıyor.
const MAX_XP_PER_RITUAL = 1000
const XP_BASE_ALLOWANCE = 1000

// Hesap oluşturma formuyla BİREBİR aynı kural seti (bkz.
// app/services/AuthService.ts isPasswordValid/getPasswordRuleStatus) -
// istemci tarafındaki kontrol sadece UX, gerçek/kesin doğrulama burada.
function isPasswordValid(password) {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  )
}

// Süre KASITLI OLARAK çok uzun: kullanıcı sadece kendi isteğiyle (Ayarlar >
// Hesap > Çıkış Yap) çıkış yapmalı, token sessizce arka planda bitmemeli.
// 7 günlük eski süre "Aysun Yavuz vakası"nın kök sebebiydi: token bitince
// journey.ts'teki arka plan senkronu (best-effort, hatayı sessizce yutuyor)
// sürekli başarısız oluyordu - kullanıcı günlerce ritüel yapmaya devam
// ediyor, cihaz ilerliyor, ama sunucu (ve dolayısıyla leaderboard) eski
// günde takılı kalıyordu; kullanıcı hiç "oturum bitti" görmüyordu çünkü
// zaten giriş yapmış görünüyordu. Bu değişiklik SADECE yeni verilen
// token'ları etkiliyor - halihazırda cihazda duran eski (7 günlük) bir
// token, süresi dolduğunda yine de bir kerelik bir yeniden-girişe ihtiyaç
// duyar (bkz. app/SessionExpiredNotice.tsx - ilerlemeyi SİLMEDEN yeniler).
//
// NOT: Render'da JWT_EXPIRES_IN ortam değişkeni ayarlıysa bu varsayılanı
// GEÇERSİZ KILAR - orada da kaldırılmalı/uzatılmalı.
function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '20y',
  })
}

function toPublicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    stats: user.stats,
    isAdmin: isAdminEmail(user.email),
    avatarVersion: user.avatarVersion || 0,
    blockedUsers: (user.blockedUsers || []).map((id) => String(id)),
  }
}

function pickStats(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined
  const stats = {}
  for (const key of STATS_FIELDS) {
    if (!(key in input)) continue
    const raw = input[key]
    if (key === 'journeyTimestamp') {
      // null ("hiç ritüel yapılmadı") VEYA pozitif bir epoch ms
      if (raw === null) stats[key] = null
      else if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) stats[key] = raw
      continue
    }
    // Diğer tüm sayaçlar: sonlu, negatif olmayan sayı - mutlak tavana kırpılıyor
    if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
      stats[key] = Math.min(Math.floor(raw), STATS_CEIL[key] ?? Number.MAX_SAFE_INTEGER)
    }
  }
  return Object.keys(stats).length ? stats : undefined
}

// register'da hesap tohumu: misafir kayıttan önce EN FAZLA 1 ritüel
// yapabiliyor (bkz. BottomNav gating) - o yüzden yeni bir hesap 1 ritüellik
// ilerlemeden fazlasıyla açılamaz. Sessizce kırpıyoruz (kaydı reddetmiyoruz).
function clampSeedStats(stats) {
  if (!stats) return undefined
  const cap = { journeyDay: 1, currentStreak: 1, totalXP: 1000, totalRitualCount: 1, totalRitualTimeSec: 300 }
  const out = { ...stats }
  for (const k of Object.keys(cap)) {
    if (typeof out[k] === 'number') out[k] = Math.min(out[k], cap[k])
  }
  return out
}

async function register(req, res) {
  const body = req.body || {}
  const name = normalizeName(body.name)
  const email = str(body.email).toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''
  const phone = str(body.phone)
  const gender = str(body.gender).slice(0, MAX_GENDER)
  const birthDate = str(body.birthDate).slice(0, MAX_BIRTHDATE)

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' })
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email address is required' })
  }
  // İstemci formuyla + şifre sıfırlamayla BİREBİR aynı kural seti - istemci
  // kontrolü sadece UX, kesin doğrulama burada.
  if (!isPasswordValid(password)) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a special character',
    })
  }
  // birthDate verildiyse geçerli bir geçmiş tarih + 13+ olmalı (COPPA /
  // Gizlilik Politikası). İstemci de kontrol ediyor ama kesin sınır burada.
  if (birthDate) {
    const dob = new Date(birthDate)
    const thirteenAgo = new Date()
    thirteenAgo.setFullYear(thirteenAgo.getFullYear() - 13)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(dob.getTime()) || dob > thirteenAgo) {
      return res.status(400).json({ error: 'You must be at least 13 years old to create an account' })
    }
  }

  // Email ve telefon HER İKİSİ de benzersiz - bir hesap silinmeden aynı
  // email veya aynı telefonla ikinci bir hesap açılamıyor (bkz. User.js
  // şemasındaki unique index'ler - buradaki kontrol daha net bir hata
  // mesajı dönmek için, gerçek garanti veritabanı seviyesinde).
  const existingEmail = await User.findOne({ email })
  if (existingEmail) return res.status(409).json({ error: 'Email already in use' })

  if (phone) {
    const existingPhone = await User.findOne({ phone })
    if (existingPhone) return res.status(409).json({ error: 'Phone number already in use' })
  }

  if (await isNameTaken(name)) return res.status(409).json({ error: 'Name already in use' })

  const resolvedLocale = body.locale === 'tr' ? 'tr' : 'en'
  const passwordHash = await User.hashPassword(password)
  const user = await User.create({
    name,
    email,
    phone: phone || undefined,
    gender: gender || undefined,
    birthDate: birthDate || undefined,
    passwordHash,
    stats: clampSeedStats(pickStats(body.stats)),
    locale: resolvedLocale,
  })

  res.status(201).json({ token: signToken(user._id), user: toPublicUser(user) })

  // Yanıt ZATEN gönderildi - hoş geldin maili kullanıcıyı bekletmiyor,
  // best-effort (başarısız olsa da hesap oluşturma geçerli kalıyor).
  const firstName = name.trim().split(' ')[0]
  sendWelcomeEmail(user.email, firstName, resolvedLocale).catch((err) => {
    console.error('[auth] Failed to send welcome email', err)
  })
}

async function login(req, res) {
  const body = req.body || {}
  const email = str(body.email).toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' })
  }

  const user = await User.findOne({ email })
  const valid = user && (await user.comparePassword(password))
  // Aynı jenerik mesaj + (kullanıcı yoksa bile) sahte bir bcrypt karşılaştırma
  // yapılmadığı için minik bir zamanlama farkı kalıyor - kabul edilebilir;
  // asıl brute-force koruması rate limit (bkz. index.js authLimiter).
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

  res.json({ token: signToken(user._id), user: toPublicUser(user) })
}

async function me(req, res) {
  const user = await User.findById(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({ user: toPublicUser(user) })
}

// Bir cihazdaki ritüel tamamlanınca (bkz. lib/journey.ts completeRitual)
// en güncel ilerlemeyi sunucuya yazıyor - başka bir cihaz/tarayıcıdan
// giriş yapıldığında "kaldığı yerden devam" bunun sayesinde çalışıyor.
//
// Anti-cheat (bkz. STATS_CEIL yorumu): birikimli sayaçlar azalamaz, mutlak
// tavanı aşamaz, XP artışı ritüel sayısı artışıyla tutarlı olmalı. Makul
// güncellemeler (çevrimdışı kalıp toplu senkronlayan biri dahil - pay
// ritüel sayısıyla ölçekleniyor) geçer; kaba hileler reddedilir.
async function updateStats(req, res) {
  const incoming = pickStats(req.body?.stats)
  if (!incoming) return res.status(400).json({ error: 'stats is required' })

  const user = await User.findById(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  const cur = user.stats || {}
  const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

  const oldXP = n(cur.totalXP)
  const oldRituals = n(cur.totalRitualCount)
  const oldTime = n(cur.totalRitualTimeSec)
  const oldDay = n(cur.journeyDay)

  const next = {
    journeyDay: 'journeyDay' in incoming ? incoming.journeyDay : oldDay,
    currentStreak: 'currentStreak' in incoming ? incoming.currentStreak : n(cur.currentStreak),
    journeyTimestamp: 'journeyTimestamp' in incoming ? incoming.journeyTimestamp : (cur.journeyTimestamp ?? null),
    totalXP: 'totalXP' in incoming ? incoming.totalXP : oldXP,
    totalRitualCount: 'totalRitualCount' in incoming ? incoming.totalRitualCount : oldRituals,
    totalRitualTimeSec: 'totalRitualTimeSec' in incoming ? incoming.totalRitualTimeSec : oldTime,
  }

  // 1) Birikimli sayaçlar ASLA azalmaz (currentStreak hariç - kaçırılan
  //    günde 0/1'e düşebilir). Eski/sıra dışı gelen bir senkron da buraya
  //    takılır, ki bu doğru davranış (yeniyi eskiyle ezme).
  if (
    next.totalXP < oldXP ||
    next.totalRitualCount < oldRituals ||
    next.totalRitualTimeSec < oldTime ||
    next.journeyDay < oldDay
  ) {
    return res.status(409).json({ error: 'Stats cannot go backwards', user: toPublicUser(user) })
  }

  // 2) XP artışı, tamamlanan ritüel sayısıyla tutarlı olmalı.
  const dRituals = next.totalRitualCount - oldRituals
  const dXP = next.totalXP - oldXP
  if (dXP > dRituals * MAX_XP_PER_RITUAL + XP_BASE_ALLOWANCE) {
    return res.status(400).json({ error: 'Invalid stats update' })
  }

  // 3) Süre artışı da ritüel sayısıyla tutarlı (ritüel ~30sn, tavan 300).
  const dTime = next.totalRitualTimeSec - oldTime
  if (dTime > dRituals * 300 + 60) {
    return res.status(400).json({ error: 'Invalid stats update' })
  }

  // 4) journeyDay bir ritüelde en fazla 1 ilerler - dRituals kadar (çevrimdışı
  //    toplu senkron payı) + küçük bir tolerans.
  if (next.journeyDay - oldDay > dRituals + 1) {
    return res.status(400).json({ error: 'Invalid stats update' })
  }

  // pickStats zaten mutlak tavana kırptı; yine de emniyet için kontrol.
  for (const [k, ceil] of Object.entries(STATS_CEIL)) {
    if (n(next[k]) > ceil) return res.status(400).json({ error: 'Invalid stats update' })
  }

  user.stats = next
  await user.save()
  res.json({ user: toPublicUser(user) })
}

// Yönetici veri düzeltmesi - bkz. devpanel/sections/UserDatabase.tsx
// "Fix stats" formu. updateStats'taki artış-tutarlılığı (anti-cheat)
// kontrollerini BİLEREK atlıyor - amacı tam olarak senkronun koptuğu
// istisnai durumlarda (ör. token süresi dolup ritüel senkronları sessizce
// başarısız olmuşsa) bir hesabın cihazdaki GERÇEK ilerlemesini sunucuya
// elle yazabilmek. Sadece requireAdmin ile erişilebiliyor; yine de mutlak
// tavanlara (pickStats -> STATS_CEIL) kırpılıyor.
async function adminSetStats(req, res) {
  const id = String(req.params.id || '')
  if (!OBJECT_ID_RE.test(id)) return res.status(400).json({ error: 'A valid user id is required' })
  const incoming = pickStats(req.body?.stats)
  if (!incoming) return res.status(400).json({ error: 'stats is required' })

  const user = await User.findById(id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  const cur = user.stats || {}
  const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

  user.stats = {
    journeyDay: 'journeyDay' in incoming ? incoming.journeyDay : n(cur.journeyDay),
    currentStreak: 'currentStreak' in incoming ? incoming.currentStreak : n(cur.currentStreak),
    journeyTimestamp: 'journeyTimestamp' in incoming ? incoming.journeyTimestamp : (cur.journeyTimestamp ?? null),
    totalXP: 'totalXP' in incoming ? incoming.totalXP : n(cur.totalXP),
    totalRitualCount: 'totalRitualCount' in incoming ? incoming.totalRitualCount : n(cur.totalRitualCount),
    totalRitualTimeSec: 'totalRitualTimeSec' in incoming ? incoming.totalRitualTimeSec : n(cur.totalRitualTimeSec),
  }
  await user.save()
  res.json({ user: toPublicUser(user) })
}

// Hesap Ayarları > İsmi Düzenle (bkz. app/profile/settings/account/page.tsx).
async function updateProfile(req, res) {
  const name = normalizeName(req.body?.name)
  if (!name) return res.status(400).json({ error: 'name is required' })
  // Kendi adının büyük/küçük harfini değiştirmek serbest (kendisi hariç tutuluyor).
  if (await isNameTaken(name, req.userId)) return res.status(409).json({ error: 'Name already in use' })
  const user = await User.findByIdAndUpdate(req.userId, { $set: { name } }, { new: true })
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({ user: toPublicUser(user) })
}

// Bildirim tercihleri / dil senkronu - client bunu ayarlar sayfasındaki bir
// toggle veya dil değişince best-effort çağırıyor (bkz. lib/authApi.ts
// updatePreferencesRequest). Sunucudaki soğuma hatırlatma job'ı (bkz.
// jobs/cooldownReminder.js) kime/hangi dilde mail atacağını buradan
// öğreniyor - token gerektirmeyen bir arka plan işi olduğu için bu bilgi
// önceden senkron edilmiş olmalı.
async function updatePreferences(req, res) {
  const { notificationPrefs, locale } = req.body || {}
  const update = {}
  if (notificationPrefs && typeof notificationPrefs === 'object') {
    if ('dailyRitualReminder' in notificationPrefs) {
      update['notificationPrefs.dailyRitualReminder'] = !!notificationPrefs.dailyRitualReminder
    }
  }
  if (locale === 'en' || locale === 'tr') update.locale = locale

  const user = await User.findByIdAndUpdate(req.userId, { $set: update }, { new: true })
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({ ok: true })
}

// Hesap Ayarları > Şifreyi Değiştir - mevcut şifre doğrulanmadan değişim
// yapılmıyor (bkz. comparePassword, User.js).
async function updatePassword(req, res) {
  const { currentPassword, newPassword, locale } = req.body || {}
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' })
  }
  if (!isPasswordValid(newPassword)) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a special character',
    })
  }

  const user = await User.findById(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const valid = await user.comparePassword(currentPassword)
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' })
  if (newPassword === currentPassword) {
    return res.status(400).json({ error: 'New password must be different from your current password' })
  }

  user.passwordHash = await User.hashPassword(newPassword)
  await user.save()
  res.json({ ok: true })

  // Yanıt ZATEN gönderildi - mail gönderimi kullanıcıyı bekletmiyor, best-
  // effort (başarısız olsa da şifre değişimi geçerli kalıyor).
  sendPasswordChangedEmail(user.email, locale === 'tr' ? 'tr' : 'en').catch((err) => {
    console.error('[auth] Failed to send password-changed email', err)
  })
}

// --- Profil fotoğrafı ---------------------------------------------------
// İstemci fotoğrafı 320x320 JPEG'e kırpıp sıkıştırıyor (bkz. app/lib/
// avatarImage.ts, ~25KB). Sunucu istemciye güvenmiyor: sadece base64 JPEG
// data URL'i, en fazla 100KB ve gerçek bir JPEG imzasıyla (FFD8FF...FFD9)
// kabul ediyor. Bayt olarak saklanıp image/jpeg + nosniff ile servis edildiği
// için içine HTML/script gömülse bile tarayıcıda çalışmaz.
const MAX_AVATAR_BYTES = 100 * 1024
const AVATAR_DATA_URL_PREFIX = 'data:image/jpeg;base64,'
const OBJECT_ID_RE = /^[a-f0-9]{24}$/i

function decodeAvatar(input) {
  if (typeof input !== 'string' || !input.startsWith(AVATAR_DATA_URL_PREFIX)) return null
  const b64 = input.slice(AVATAR_DATA_URL_PREFIX.length)
  // Çözmeden önce dev gövdeyi at (base64 ~%33 şişirir).
  if (b64.length === 0 || b64.length > Math.ceil((MAX_AVATAR_BYTES * 4) / 3) + 4) return null
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return null
  const buf = Buffer.from(b64, 'base64')
  if (buf.length < 4 || buf.length > MAX_AVATAR_BYTES) return null
  if (buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) return null
  if (buf[buf.length - 2] !== 0xff || buf[buf.length - 1] !== 0xd9) return null
  return buf
}

// Hesap Ayarları > Profil fotoğrafı (bkz. app/profile/settings/account/page.tsx).
async function updateAvatar(req, res) {
  const data = decodeAvatar(req.body?.image)
  if (!data) return res.status(400).json({ error: 'A JPEG image up to 100 KB is required' })
  const user = await User.findByIdAndUpdate(
    req.userId,
    { $set: { avatarData: data, avatarVersion: Date.now(), avatarHidden: false } },
    { new: true }
  )
  if (!user) return res.status(404).json({ error: 'User not found' })
  // Bildirimler ESKİ fotoğraf içindi - yeni fotoğraf temiz başlıyor.
  await Report.deleteMany({ reported: req.userId })
  res.json({ user: toPublicUser(user) })
}

async function removeAvatar(req, res) {
  const user = await User.findByIdAndUpdate(
    req.userId,
    { $set: { avatarVersion: 0, avatarHidden: false }, $unset: { avatarData: 1 } },
    { new: true }
  )
  if (!user) return res.status(404).json({ error: 'User not found' })
  await Report.deleteMany({ reported: req.userId })
  res.json({ user: toPublicUser(user) })
}

// Herkese açık: <img src> Authorization başlığı gönderemiyor ve leaderboard'da
// başkalarının fotoğraflarını da gösteriyoruz. Leaderboard zaten herkese açık
// (kısaltılmış adla) - bu da onunla aynı görünürlükte, sadece kullanıcı
// fotoğraf yüklediyse var.
async function getAvatar(req, res) {
  const id = String(req.params.id || '')
  if (!OBJECT_ID_RE.test(id)) return res.status(404).end()
  const user = await User.findById(id).select('+avatarData avatarVersion avatarHidden')
  // avatarHidden: birkaç kişiden bildirim alan fotoğraf servis edilmiyor.
  if (!user || !user.avatarVersion || !user.avatarData || user.avatarHidden) return res.status(404).end()
  res.set({
    'Content-Type': 'image/jpeg',
    // helmet varsayılanı `same-origin` - Capacitor WebView'in origin'i
    // (capacitor://localhost) API'den farklı, bu başlık olmadan <img> engellenir.
    'Cross-Origin-Resource-Policy': 'cross-origin',
    // URL'deki ?v= sürümü değişince URL de değişiyor - sürümlü istek sonsuza
    // kadar önbelleğe alınabilir, sürümsüz olan her seferinde doğrulanır.
    'Cache-Control': req.query.v ? 'public, max-age=31536000, immutable' : 'no-cache',
  })
  res.send(user.avatarData)
}

// Hesap Ayarları > Hesabı Sil - kullanıcıyı DB'den GERÇEKTEN siliyor (bkz.
// leaderboard() - silinen bir hesap User.find({}) sorgusunda artık hiç
// dönmüyor, leaderboard'da otomatik olarak görünmez oluyor).
async function removeAccount(req, res) {
  const user = await User.findByIdAndDelete(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  // Bu hesapla ilgili moderasyon kayıtları da gidiyor: hakkındaki/yaptığı
  // bildirimler ve başkalarının engel listelerindeki kimliği.
  await Report.deleteMany({ $or: [{ reporter: req.userId }, { reported: req.userId }] })
  await User.updateMany({ blockedUsers: req.userId }, { $pull: { blockedUsers: req.userId } })
  res.json({ ok: true })
}

// Hesap oluşturma formunda email/telefon alanından çıkılınca (blur) çağrılan
// erken/canlı kontrol - kullanıcı bütün formu + telefon/email OTP adımlarını
// doldurup EN SONDA "zaten kayıtlı" hatası almasın diye. Gerçek/kesin kontrol
// hâlâ register() içinde yapılıyor (bu uç noktalar sadece erken uyarı için,
// aradaki kısa sürede aynı email/telefon başka biri tarafından alınırsa
// register() yine 409 döner).
async function checkEmail(req, res) {
  const email = String(req.query.email || '').toLowerCase().trim()
  if (!email) return res.json({ available: true })
  const existing = await User.findOne({ email })
  res.json({ available: !existing })
}

async function checkPhone(req, res) {
  const phone = String(req.query.phone || '').trim()
  if (!phone) return res.json({ available: true })
  const existing = await User.findOne({ phone })
  res.json({ available: !existing })
}

// "Ada Soyada" -> "Ad S." - Leaderboard herkese açık ve başka kullanıcıların
// TAM adını göstermek gereksiz bir kişisel veri ifşası. Kısaltılmış ad
// sunucudan çıkıyor, tam ad başkalarının cihazına hiç ulaşmıyor.
function displayNameForLeaderboard(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Velis user'
  if (parts.length === 1) return parts[0]
  const lastInitial = parts[parts.length - 1][0].toUpperCase()
  return `${parts[0]} ${lastInitial}.`
}

// Herkese açık - Leaderboard sadece gerçekten kayıt olmuş kullanıcılardan
// oluşuyor (bkz. app/leaderboard/page.tsx). Şifre/email/TAM ad dönmüyor -
// sadece kısaltılmış görünen ad + sıralama için gereken istatistikler.
async function leaderboard(req, res) {
  const users = await User.find({}, 'name stats avatarVersion avatarHidden').lean()
  res.json({
    users: users.map((u) => ({
      id: u._id,
      name: displayNameForLeaderboard(u.name),
      stats: u.stats,
      // Fotoğrafın kendisi burada DEĞİL (100 kullanıcı = megabaytlarca JSON) -
      // sadece sürüm; istemci varsa GET /api/auth/avatar/:id?v=... ile çekiyor.
      // Gizlenen (bildirim alan) fotoğraf listede "yok" sayılıyor.
      avatarVersion: u.avatarHidden ? 0 : u.avatarVersion || 0,
    })),
  })
}

// SADECE admin panelindeki "kayıtlı hesaplar" görünümü için (bkz.
// devpanel/sections/UserDatabase.tsx). requireAdmin ile korunuyor - route'a
// bakınız. passwordHash HİÇBİR ZAMAN dönmüyor (projeksiyona dahil değil).
async function listUsers(req, res) {
  const users = await User.find({}, 'name email phone gender birthDate locale stats createdAt')
    .sort({ createdAt: -1 })
    .lean()
  res.json({
    users: users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone || null,
      gender: u.gender || null,
      birthDate: u.birthDate || null,
      locale: u.locale || 'en',
      isAdmin: isAdminEmail(u.email),
      stats: u.stats || {},
      createdAt: u.createdAt,
    })),
  })
}

module.exports = {
  // moderationController da kullanıyor
  toPublicUser,
  displayNameForLeaderboard,
  register,
  login,
  me,
  updateStats,
  adminSetStats,
  updateProfile,
  updatePreferences,
  updatePassword,
  updateAvatar,
  removeAvatar,
  getAvatar,
  removeAccount,
  leaderboard,
  listUsers,
  checkEmail,
  checkPhone,
}
