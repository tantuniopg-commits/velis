const User = require('../models/User')
const { sendPush } = require('../lib/apn')
const { pickCopy } = require('../lib/notificationCopy')

// Faz 2: bildirim ZAMANLAMASINI ve İÇERİĞİNİ sunucu belirliyor, istemci
// sadece push token'ını kaydedip bekliyor (bkz. AGENTS.md "Bildirimler",
// app/services/notifications). Kullanıcı HİÇBİR saat/tür seçmiyor - tek bir
// "Bildirimler" açma/kapama var.
//
// Sabit program: her gün 09:00 / 15:00 / 21:00 (TÜRKİYE SAATİ, UTC+3,
// yaz/kış saati uygulaması yok - sabit ofset), 00:00-07:00 arası HİÇ
// bildirim yok (bu zaten 3 slotun dışında kaldığı için ayrı bir "sessiz
// saat" kontrolüne gerek yok). TÜM kullanıcılar için AYNI saat dilimi
// varsayılıyor - kullanıcı başına gerçek saat dilimi şu an hiçbir yerde
// saklanmıyor; ileride gerekirse User'a bir `timezone` alanı eklenip bu
// sabit TR_OFFSET_MS'in yerini alabilir.
const TR_OFFSET_MS = 3 * 60 * 60 * 1000
const SLOT_HOURS = [9, 15, 21]
const CHECK_INTERVAL_MS = 60 * 1000 // her dakika kontrol - ilgili dakikayı kaçırmamak için
const MILESTONE_DAYS = [1, 3, 7, 14, 30, 90]

function trNow() {
  return new Date(Date.now() + TR_OFFSET_MS)
}

// TR saatine göre "YYYY-MM-DD" - Date nesnesi zaten TR ofsetiyle kaydırılmış
// olduğu için UTC alanlarını okumak "yerel" (TR) tarihi/saati verir.
function trDateKey(d) {
  return d.toISOString().slice(0, 10)
}

function isSameTrDay(timestampMs, todayKey) {
  if (!timestampMs) return false
  return trDateKey(new Date(timestampMs + TR_OFFSET_MS)) === todayKey
}

// Aynı slotta (ör. 09:00) sunucu birden fazla dakika kontrolüyle iki kez
// çalışmasın diye - sadece process belleğinde, restart'ta sıfırlanır (kabul
// edilebilir: en kötü ihtimalle bir restart anına denk gelirse o slot bir
// kez daha kontrol edilir, zaten idempotent - aynı gün için zaten
// gönderilmişse `lastMilestoneNotified`/`isSameTrDay` tekrar göndermez).
let lastRunKey = null

async function sendSlotPushes(todayKey) {
  // pushToken select:false - job'ın açıkça istemesi gerekiyor.
  const users = await User.find({ notificationsEnabled: true, pushToken: { $ne: null } }).select('+pushToken')

  for (const user of users) {
    try {
      const streak = user.stats?.currentStreak || 0
      const milestoneDay = MILESTONE_DAYS.find((d) => streak === d)

      if (milestoneDay && user.lastMilestoneNotified !== milestoneDay) {
        const { title, body } = pickCopy('milestone', user.locale, { days: milestoneDay })
        await sendPush(user.pushToken, {
          title,
          body,
          target: milestoneDay % 7 === 0 ? `/reward?day=${milestoneDay}` : '/journey',
        })
        user.lastMilestoneNotified = milestoneDay
        await user.save()
        continue // bu slotta kullanıcıya zaten bir bildirim gitti, ritual reminder'ı da üstüne eklemiyoruz
      }

      const doneToday = isSameTrDay(user.stats?.journeyTimestamp, todayKey)
      if (!doneToday) {
        const { title, body } = pickCopy('ritualReminder', user.locale)
        await sendPush(user.pushToken, { title, body, target: '/' })
      }
    } catch (err) {
      console.error('[pushReminderJob] kullanıcı için başarısız', user._id, err)
    }
  }
}

async function checkSlot() {
  const tr = trNow()
  const hour = tr.getUTCHours()
  const minute = tr.getUTCMinutes()
  if (!SLOT_HOURS.includes(hour) || minute !== 0) return
  const key = `${trDateKey(tr)}T${hour}`
  if (lastRunKey === key) return
  lastRunKey = key
  await sendSlotPushes(trDateKey(tr))
}

function startPushReminderJob() {
  setInterval(() => {
    checkSlot().catch((err) => console.error('[pushReminderJob] Check failed', err))
  }, CHECK_INTERVAL_MS)
}

module.exports = { startPushReminderJob, checkSlot, sendSlotPushes, trNow, trDateKey }
