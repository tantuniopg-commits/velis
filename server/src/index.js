require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const mongoSanitize = require('express-mongo-sanitize')
const connectDB = require('./config/db')
const authRoutes = require('./routes/authRoutes')
const otpRoutes = require('./routes/otpRoutes')
const { startCooldownReminderJob } = require('./jobs/cooldownReminder')

const isProd = process.env.NODE_ENV === 'production'

// JWT_SECRET olmadan token imzalamak = herkesin geçerli token üretebilmesi.
// Üretimde eksikse süreç HİÇ başlamamalı; sadece yerel geliştirmede zayıf
// bir varsayılana düşüyoruz (o da localhost'tan dışarı çıkmıyor).
if (!process.env.JWT_SECRET) {
  if (isProd) {
    console.error('FATAL: JWT_SECRET is not set. Refusing to start in production.')
    process.exit(1)
  }
  process.env.JWT_SECRET = 'velis-dev-secret-do-not-use-in-production'
} else if (isProd && process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET is too short (<32 chars) for production.')
  process.exit(1)
}

const app = express()

// Render (ve çoğu PaaS) uygulamayı bir ters proxy arkasında çalıştırıyor -
// gerçek istemci IP'si X-Forwarded-For'da. Rate limit'in IP'yi doğru
// görebilmesi için tek proxy'ye güveniyoruz.
app.set('trust proxy', 1)

// Güvenlik başlıkları (HSTS, X-Content-Type-Options, referrer-policy, ...).
// API JSON döndürüyor, HTML sayfa sunmuyor - CSP/COEP gibi tarayıcı-sayfası
// korumaları gerekmiyor, kapalı bırakıp gereksiz kırılma riskini almıyoruz.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  })
)

// CORS - yalnızca bilinen origin'ler. Capacitor iOS uygulaması isteklerini
// `capacitor://localhost` origin'iyle atıyor (Capacitor sürümüne göre
// `ionic://localhost` / `https://localhost` de olabilir); yerel web
// geliştirme `http://localhost:*`; genel site GitHub Pages'te.
//
// NOT: origin başlığı HİÇ yoksa (native HTTP, curl, server-to-server) izin
// var - CORS zaten sadece TARAYICI kaynaklı çapraz istekleri kısıtlar, o
// yüzden mobil uygulamanın API çağrıları origin göndermese bile çalışır.
// Bu liste, kötü niyetli bir web sitesinin tarayıcıdan API'mize kimlik
// bilgisiyle istek atmasını engelliyor.
const EXPLICIT_ORIGINS = new Set([
  'https://tantuniopg-commits.github.io',
  ...(process.env.EXTRA_CORS_ORIGINS ? process.env.EXTRA_CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean) : []),
])
// Capacitor/Ionic webview + localhost ailesi (port'lu/portsuz).
const LOCAL_ORIGIN_RE = /^(capacitor|ionic|https?):\/\/localhost(:\d+)?$/
function isAllowedOrigin(origin) {
  return EXPLICIT_ORIGINS.has(origin) || LOCAL_ORIGIN_RE.test(origin)
}
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || isAllowedOrigin(origin)) return cb(null, true)
      cb(new Error('Not allowed by CORS'))
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
)

// Gövde boyutu tavanı - hiçbir uç nokta büyük yük almıyor (en fazla birkaç
// yüz baytlık JSON). Tavan olmadan bir saldırgan dev gövdelerle belleği
// şişirebilir.
app.use(express.json({ limit: '16kb' }))

// NoSQL operatör enjeksiyonu: `{"email": {"$gt": ""}}` gibi gövdeler
// mongoose sorgusuna operatör kaçırabilir. Anahtarlardaki `$` ve `.`
// karakterlerini temizliyoruz (controller'lardaki String() sarmalayıcıları
// zaten ikinci bir savunma katmanı).
app.use(mongoSanitize())

// --- Rate limiting -----------------------------------------------------
// Gerçek kullanıcı bu sınırlara ASLA çarpmaz; brute-force / spam / suistimali
// kesiyor. Anahtar: proxy arkasındaki gerçek IP (trust proxy sayesinde).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 15 dk'da 30 deneme (login + register + şifre sıfırlama toplamı)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
})
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // kod gönder/doğrula - üstüne bir de controller'da 60sn cooldown var
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification requests. Please try again later.' },
})
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120, // authenticated normal kullanım (stats senkronu vb.) için bol
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
})

app.use(generalLimiter)

app.get('/health', (req, res) => res.json({ ok: true }))

// Kimlik/parola uçları - sıkı limit. Diğer /api/auth uçları (stats, profile,
// me ...) generalLimiter altında kalıyor.
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)
app.use('/api/auth/forgot-password', authLimiter)
app.use('/api/auth/verify-reset-code', authLimiter)
app.use('/api/auth/reset-password', authLimiter)
app.use('/api/otp', otpLimiter)

app.use('/api/auth', authRoutes)
app.use('/api/otp', otpRoutes)

// Hata mesajını kıs - istemciye asla stack/iç detay sızmıyor. Tam hata
// sadece sunucu loglarında.
app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' })
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large' })
  }
  // Bozuk JSON gövdesi istemci hatası - 500 değil 400, stack de loglanmıyor.
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON' })
  }
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

const port = process.env.PORT || 4000

connectDB()
  .then(() => {
    app.listen(port, () => console.log(`Auth server listening on port ${port}`))
    startCooldownReminderJob()
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err)
    process.exit(1)
  })
