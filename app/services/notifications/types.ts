// Bildirim sisteminin ortak tipleri - tüm alt modüller (store/copy/scheduler/
// permissions/deepLink) buradan okuyor. Faz 1: SADECE yerel (cihaz
// zamanlayıcılı) bildirimler - bkz. AGENTS.md "Bildirimler" bölümü.

export type NotificationKind = 'ritualReminder' | 'hardMoment' | 'milestone' | 'checkin'

// "HH:mm" formatında, 24 saatlik, cihazın yerel saatine göre (bkz.
// scheduler.ts - Capacitor'ın `on:{hour,minute}` değil, bilinçli olarak
// her zaman TEK SEFERLİK `at:Date` ile kuruyoruz, bkz. scheduler.ts başı).
export type TimeOfDay = string

export type QuietHours = {
  start: TimeOfDay
  end: TimeOfDay
}

export type NotificationPrefs = {
  // Sistem izni daha önce hiç istenmedi mi (soft-ask'ın tekrar
  // gösterilip gösterilmeyeceğini belirler) - bkz. permissions.ts.
  softAskShown: boolean
  ritualReminder: { enabled: boolean; times: TimeOfDay[] }
  hardMoment: { enabled: boolean; times: TimeOfDay[]; minutesBefore: number }
  milestone: { enabled: boolean }
  checkin: { enabled: boolean }
  quietHours: QuietHours
}

// Kilometre taşı günleri - sigarasız gün serisi bunlardan birine ulaşınca
// (bkz. lib/journey.ts completeRitual) anında bir bildirim planlanır.
export const MILESTONE_DAYS = [1, 3, 7, 14, 30, 90] as const

// Günde en fazla kaç bildirim (tür fark etmeksizin, toplam) - sabit, kullanıcı
// tarafından değiştirilemiyor (bkz. talep md.4). store.ts'teki günlük sayaç
// bu sınıra göre çalışıyor.
export const MAX_NOTIFICATIONS_PER_DAY = 3

// Nazik check-in için "kaç gündür açılmadı" eşiği - "2-3 gün" aralığının
// ortası (bkz. talep md.3/4).
export const CHECKIN_INACTIVITY_MS = 60 * 60 * 1000 * 60 // 60 saat (~2.5 gün)

// Capacitor local-notifications sayısal `id` istiyor - sabit aralıklar,
// aynı slot her zaman aynı id'yi kullanıyor ki yeniden kurarken eskisinin
// YERİNE geçsin (cancel+schedule yerine tek schedule çağrısı aynı id'yle
// de üzerine yazıyor, ama biz netlik için hep önce cancel ediyoruz).
export const NOTIFICATION_IDS = {
  ritualReminder: (slot: number) => 1000 + slot,
  hardMoment: (slot: number) => 2000 + slot,
  milestone: (day: number) => 3000 + day,
  checkin: 4001,
} as const

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  softAskShown: false,
  ritualReminder: { enabled: false, times: ['20:00'] },
  hardMoment: { enabled: false, times: [], minutesBefore: 10 },
  milestone: { enabled: false },
  checkin: { enabled: false },
  quietHours: { start: '23:00', end: '08:00' },
}
