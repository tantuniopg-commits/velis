// Bildirim zamanlama çekirdeği - TEK yer, tüm ekranlar buradan çağırır
// (bkz. AGENTS.md "Bildirimler"). Faz 1: SADECE @capacitor/local-notifications,
// sunucu yok.
//
// BİLİNÇLİ TASARIM KARARI: "ritual hatırlatması" ve "zor an" için Capacitor'ın
// native `repeats:true, on:{hour,minute}` (takvim bazlı, otomatik tekrar eden)
// tetikleyicisi KULLANILMIYOR. Bunun yerine her seferinde SADECE bir sonraki
// tek oluşum `at:Date` ile kuruluyor ve her "re-arm" çağrısında (uygulama
// açılışı / ritüel tamamlanması / ayar değişikliği) cancel+reschedule
// ediliyor. Sebep: "kullanıcı ritüeli zaten yaptıysa o günün hatırlatmasını
// iptal et" (bkz. talep md.4) native bir tekrarlayan tetikleyicide TEK bir
// günü atlamayı desteklemiyor - bu yüzden kontrolü tamamen JS tarafında
// tutuyoruz. Saat dilimi / cihaz yeniden başlatma: `at:Date` bir mutlak an
// olduğu için ikisinden de doğal olarak etkilenmiyor (iOS bekleyen yerel
// bildirimleri reboot'ta KORUYOR); her yeni "re-arm" zaten GÜNCEL cihaz
// saatine göre bir sonraki anı yeniden hesaplıyor, yani saat dilimi
// değişimi bir sonraki re-arm'da otomatik düzeliyor.
import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'
import { getStoredStats } from '../../lib/auth'
import { pickNotificationCopy } from './copy'
import {
  canScheduleOneMoreToday,
  getLastOpenAt,
  recordScheduledToday,
  setLastOpenAt,
} from './store'
import { getNotificationPrefs } from './store'
import {
  CHECKIN_INACTIVITY_MS,
  MILESTONE_DAYS,
  NOTIFICATION_IDS,
  type NotificationKind,
  type QuietHours,
  type TimeOfDay,
} from './types'

const isNative = () => Capacitor.isNativePlatform()

function parseTime(t: TimeOfDay): { hour: number; minute: number } {
  const [h, m] = t.split(':').map((n) => Number(n) || 0)
  return { hour: h, minute: m }
}

// "HH:mm" bugünün tarihine uygulanıp, geçmişse yarına kaydırılmış bir Date
// döndürür (daima gelecekte bir an).
function nextOccurrence(time: TimeOfDay, from: Date = new Date()): Date {
  const { hour, minute } = parseTime(time)
  const d = new Date(from)
  d.setHours(hour, minute, 0, 0)
  if (d.getTime() <= from.getTime()) d.setDate(d.getDate() + 1)
  return d
}

// Sessiz saatler aralığına düşüyorsa aralığın BİTİŞİNE kaydırır (iptal değil,
// ertele - bkz. talep md.4). Aralık gece yarısını sarabiliyor (ör. 23:00-08:00).
function shiftOutOfQuietHours(date: Date, quiet: QuietHours): Date {
  const { hour: qsH, minute: qsM } = parseTime(quiet.start)
  const { hour: qeH, minute: qeM } = parseTime(quiet.end)
  const minutesOfDay = date.getHours() * 60 + date.getMinutes()
  const qs = qsH * 60 + qsM
  const qe = qeH * 60 + qeM
  const spansMidnight = qs > qe
  const inQuiet = spansMidnight ? minutesOfDay >= qs || minutesOfDay < qe : minutesOfDay >= qs && minutesOfDay < qe
  if (!inQuiet) return date
  const shifted = new Date(date)
  shifted.setHours(qeH, qeM, 0, 0)
  // Sessiz saat gece yarısını sarıyorsa ve şu an "gece yarısından sonraki"
  // kısımdaysak (ör. 02:00), bitiş zaten bugün - aksi halde (ör. 23:30'da
  // tetiklenip aralık yarına taşıyorsa) bir gün ileri alınıyor.
  if (shifted.getTime() <= date.getTime()) shifted.setDate(shifted.getDate() + 1)
  return shifted
}

// Günlük sınıra (varsayılan 3) takılırsa bir sonraki güne, AYNI saate iter -
// en fazla 7 kez dener (sonsuz döngü riskine karşı güvenlik payı).
function respectDailyCap(date: Date, quiet: QuietHours): Date {
  let candidate = shiftOutOfQuietHours(date, quiet)
  for (let i = 0; i < 7 && !canScheduleOneMoreToday(candidate); i++) {
    const next = new Date(candidate)
    next.setDate(next.getDate() + 1)
    candidate = shiftOutOfQuietHours(next, quiet)
  }
  return candidate
}

async function ensureListChannelReady() {
  if (!isNative()) return
  if (Capacitor.getPlatform() === 'android') {
    // Android 13+ (API 33) POST_NOTIFICATIONS iznini de requestPermissions()
    // zaten kapsıyor (plugin otomatik ekliyor). Kanal şu an için TEK ve
    // varsayılan - android/ projesi eklendiğinde buraya dönüp tür başına
    // kanal (ör. farklı ses/önem seviyesi) ayırmak iyi olur.
    try {
      await LocalNotifications.createChannel({
        id: 'velis_default',
        name: 'VELIS',
        description: 'Ritüel hatırlatmaları ve nazik bildirimler',
        importance: 4,
        visibility: 1,
      })
    } catch {
      // Kanal zaten varsa / platform desteklemiyorsa sessizce geç.
    }
  }
}

async function cancelIds(ids: number[]) {
  if (!isNative() || ids.length === 0) return
  try {
    await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) })
  } catch {
    // Kurulu değilse cancel zaten no-op - sessiz geç.
  }
}

async function scheduleOne(params: { id: number; kind: NotificationKind; at: Date; target: string; vars?: Record<string, string | number> }) {
  if (!isNative()) return
  const { id, kind, at, target, vars } = params
  const { title, body } = pickNotificationCopy(kind, vars)
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title,
          body,
          schedule: { at },
          extra: { target },
        },
      ],
    })
    recordScheduledToday(at)
  } catch (err) {
    console.error('[notifications] schedule failed', kind, err)
  }
}

// ---- Tür 1: Ritüel hatırlatması ----
// Her slot (kullanıcının seçtiği saat) için bir sonraki oluşumu kurar. Ritüel
// BUGÜN zaten tamamlandıysa (journeyTimestamp bugüne denk geliyorsa) bugünkü
// saat geçmemiş olsa bile YARINA kurulur (bkz. talep md.4 "iptal et").
export async function rearmRitualReminders() {
  const prefs = getNotificationPrefs()
  const slotIds = prefs.ritualReminder.times.map((_, i) => NOTIFICATION_IDS.ritualReminder(i))
  await cancelIds(slotIds.length ? slotIds : [NOTIFICATION_IDS.ritualReminder(0)])
  if (!prefs.ritualReminder.enabled || prefs.ritualReminder.times.length === 0) return

  const stats = getStoredStats()
  const doneToday = isSameLocalDay(stats.journeyTimestamp, Date.now())

  for (let i = 0; i < prefs.ritualReminder.times.length; i++) {
    const time = prefs.ritualReminder.times[i]
    let at = nextOccurrence(time)
    if (doneToday && isSameLocalDay(at.getTime(), Date.now())) {
      // Bugünkü oluşum henüz geçmemiş olsa bile, ritüel zaten yapıldığı
      // için bugünü atlayıp yarına kur.
      at.setDate(at.getDate() + 1)
    }
    at = respectDailyCap(at, prefs.quietHours)
    await scheduleOne({ id: NOTIFICATION_IDS.ritualReminder(i), kind: 'ritualReminder', at, target: '/' })
  }
}

function isSameLocalDay(tsA: number | null, tsB: number): boolean {
  if (tsA === null) return false
  const a = new Date(tsA)
  const b = new Date(tsB)
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// ---- Tür 2: Zor an desteği ----
// Kullanıcının işaretlediği "en çok içmek istediğim saatler"den birkaç dk
// önce - ritüel yapılıp yapılmadığına bakmaksızın HER GÜN (bir craving riski
// günün o saatinde hep var, o gün ritüel yapılmış olması bunu değiştirmiyor).
export async function rearmHardMomentReminders() {
  const prefs = getNotificationPrefs()
  const slotIds = prefs.hardMoment.times.map((_, i) => NOTIFICATION_IDS.hardMoment(i))
  await cancelIds(slotIds.length ? slotIds : [NOTIFICATION_IDS.hardMoment(0)])
  if (!prefs.hardMoment.enabled || prefs.hardMoment.times.length === 0) return

  for (let i = 0; i < prefs.hardMoment.times.length; i++) {
    const { hour, minute } = parseTime(prefs.hardMoment.times[i])
    // `setHours`'a negatif dakika vermek Date'i doğru şekilde geri
    // taşıyor (ör. saat 00:05, 10dk önce -> dün 23:55) - JS Date bu
    // taşmayı kendisi normalize ediyor, elle gün hesaplamaya gerek yok.
    const at = new Date()
    at.setHours(hour, minute - prefs.hardMoment.minutesBefore, 0, 0)
    if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1)
    const final = respectDailyCap(at, prefs.quietHours)
    await scheduleOne({ id: NOTIFICATION_IDS.hardMoment(i), kind: 'hardMoment', at: final, target: '/' })
  }
}

// ---- Tür 3: Kilometre taşı ----
// Ritüel tamamlanıp gün sayısı ilerlediği ANDA çağrılır (bkz. lib/journey.ts
// completeRitual) - gelecek bir zaman için KURULMUYOR, hemen (birkaç saniye
// sonrası) tetiklenen tek seferlik bir bildirim.
export async function notifyMilestoneIfReached(previousStreak: number, newStreak: number) {
  const prefs = getNotificationPrefs()
  if (!prefs.milestone.enabled) return
  const reached = MILESTONE_DAYS.find((d) => newStreak >= d && previousStreak < d)
  if (reached == null) return
  const soon = new Date(Date.now() + 3000) // ritüel tamamlanma animasyonuyla çakışmasın diye 3sn sonra
  // Gece yarısına yakın bir ritüel bu bildirimi sessiz saatlere denk
  // getirebilir - diğer türlerle aynı kural (bkz. talep md.4), sessiz saat
  // bitimine ertelenir, günlük sınıra da tabi.
  const at = respectDailyCap(soon, prefs.quietHours)
  const target = reached % 7 === 0 ? `/reward?day=${reached}` : '/journey'
  await scheduleOne({ id: NOTIFICATION_IDS.milestone(reached), kind: 'milestone', at, target, vars: { days: reached } })
}

// ---- Tür 4: Nazik check-in ----
// Her app açılışında çağrılır - önceki bekleyen check-in'i iptal edip
// CHECKIN_INACTIVITY_MS kadar ileriye yeni bir tane kurar. Kullanıcı bu süre
// içinde tekrar açarsa (bu fonksiyon tekrar çağrılır) zamanlayıcı sıfırdan
// başlar, hiç ateşlenmez. Açmazsa TEK SEFER ateşlenir ve bir sonraki açılışa
// kadar YENİDEN KURULMAZ ("sonra sus" - bkz. talep md.3).
export async function rearmCheckin() {
  setLastOpenAt(Date.now())
  const prefs = getNotificationPrefs()
  await cancelIds([NOTIFICATION_IDS.checkin])
  if (!prefs.checkin.enabled) return
  const at = shiftOutOfQuietHours(new Date(Date.now() + CHECKIN_INACTIVITY_MS), prefs.quietHours)
  await scheduleOne({ id: NOTIFICATION_IDS.checkin, kind: 'checkin', at, target: '/' })
}

export function getLastOpenAtMs(): number | null {
  return getLastOpenAt()
}

// ---- Uygulama başlangıcında tek seferlik kurulum ----
export async function initScheduler() {
  await ensureListChannelReady()
  await rearmRitualReminders()
  await rearmHardMomentReminders()
  await rearmCheckin()
}

// Ayarlar ekranından herhangi bir tercih değiştiğinde çağrılır - tüm
// zamanlanmış bildirimleri güncel tercihlere göre yeniden kurar (sessiz
// saatler/günlük sınır dahil, her türün kendi re-arm fonksiyonunu çağırarak).
export async function rescheduleAllFromSettings() {
  await rearmRitualReminders()
  await rearmHardMomentReminders()
  // checkin kasıtlı olarak burada YOK - ayar değişikliği "açılış" sayılmaz,
  // sadece gerçek rearmCheckin() (app açılışı) sıfırlamalı.
}
