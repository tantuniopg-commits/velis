const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

// Journey/XP ilerlemesi - VELIS istemcisinin lib/auth.ts'teki VelisStats
// tipiyle birebir aynı şekil. Sunucuda tutuluyor ki bir hesaba başka bir
// cihaz/tarayıcıdan giriş yapıldığında ilerleme "kaldığı yerden" devam etsin
// (istemci-only localStorage tek başına bunu sağlayamıyordu).
const statsSchema = new mongoose.Schema(
  {
    journeyDay: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    journeyTimestamp: { type: Number, default: null },
    totalXP: { type: Number, default: 0 },
    totalRitualCount: { type: Number, default: 0 },
    totalRitualTimeSec: { type: Number, default: 0 },
  },
  { _id: false }
)

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // sparse:true - var olan hesaplarda (bu alan eklenmeden önce oluşturulmuş)
    // phone yok/undefined; sparse olmadan unique index bunu tek bir "boş"
    // değer olarak sayıp ikinci undefined'da index kurulumunu kırardı.
    phone: { type: String, unique: true, sparse: true, trim: true },
    passwordHash: { type: String, required: true },
    // Hesap oluşturma formunda toplanıyor (bkz. app/profile/page.tsx) - şu an
    // sadece admin panelindeki kullanıcı listesinde gösteriliyor, başka bir
    // yerde kullanılmıyor. İkisi de opsiyonel (bu alanlar eklenmeden önce
    // açılmış hesaplarda yok).
    gender: { type: String, trim: true },
    birthDate: { type: String, trim: true },
    stats: { type: statsSchema, default: () => ({}) },
    // Profil fotoğrafı - istemci 320x320 JPEG'e küçültüp gönderiyor (bkz.
    // app/lib/avatarImage.ts), burada ham bayt olarak saklanıyor. select:false
    // ki her User sorgusu (login, me, leaderboard...) ~25KB'lık fotoğrafı
    // boşuna belleğe çekmesin - sadece GET /api/auth/avatar/:id istiyor.
    avatarData: { type: Buffer, select: false },
    // 0 = fotoğraf yok. Her değişimde Date.now() - istemci bunu URL'ye ?v=
    // olarak ekleyip tarayıcı önbelleğini kırıyor.
    avatarVersion: { type: Number, default: 0 },
    // Bildirim tercihleri + dil - sunucudaki soğuma hatırlatma job'ı (bkz.
    // jobs/cooldownReminder.js) hangi hesaba mail atacağını ve hangi dilde
    // yazacağını buradan öğreniyor (bkz. lib/authApi.ts updatePreferencesRequest,
    // client bunları toggle/dil değişince best-effort senkronluyor).
    notificationPrefs: {
      dailyRitualReminder: { type: Boolean, default: true },
    },
    locale: { type: String, enum: ['en', 'tr'], default: 'en' },
    // Aynı soğuma döngüsü için hatırlatmanın birden fazla kez gönderilmesini
    // önlüyor - o anki journeyTimestamp'e eşitse bu döngü için zaten
    // gönderilmiş demektir. lastReadyReminderFor "soğuma tam bitti" maili
    // için aynı mantığın ayrı bir bayrağı.
    lastCooldownReminderFor: { type: Number, default: null },
    lastReadyReminderFor: { type: Number, default: null },
  },
  { timestamps: true }
)

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash)
}

userSchema.statics.hashPassword = function hashPassword(plain) {
  return bcrypt.hash(plain, 10)
}

module.exports = mongoose.model('User', userSchema)
