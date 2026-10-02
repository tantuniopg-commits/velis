// Bildirim sisteminin ortak tipleri - Faz 2 (bkz. AGENTS.md "Bildirimler").
// Kullanıcı HİÇBİR saat/tür seçmiyor - tek bir "Bildirimler" açma/kapama var.
// Zamanlama ve içerik tamamen SUNUCUDA (bkz. server/src/jobs/
// pushReminderJob.js): her gün 09:00/15:00/21:00 TR saati, 00:00-07:00 arası
// hiç gönderilmiyor - bu sabitler istemci tarafında SADECE bilgilendirme
// metninde kullanılıyor, gerçek zamanlama mantığı burada YOK.
export type NotificationPrefs = {
  // Sistem izni daha önce hiç istenmedi mi (soft-ask'ın tekrar
  // gösterilip gösterilmeyeceğini belirler) - bkz. permissions.ts.
  softAskShown: boolean
  enabled: boolean
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  softAskShown: false,
  enabled: false,
}
