// Bildirim servisinin tek giriş noktası - ekranlar BURADAN import etsin,
// alt modülleri (store/permissions/deepLink) doğrudan import etmesin (bkz.
// AGENTS.md "Bildirimler"). Faz 2: zamanlama/içerik sunucuda, bkz.
// server/src/jobs/pushReminderJob.js.
export {
  shouldShowSoftAsk,
  acceptSoftAsk,
  declineSoftAsk,
  enablePushNotifications,
  disablePushNotifications,
  syncPushTokenToServer,
  getPermissionStatus,
  openSystemSettings,
} from './permissions'
export { initNotificationDeepLinks } from './deepLink'
export { getNotificationPrefs, patchNotificationPrefs } from './store'
export { DEFAULT_NOTIFICATION_PREFS } from './types'
export type { NotificationPrefs } from './types'
