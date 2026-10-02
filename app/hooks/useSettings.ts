'use client'

import { useCallback, useEffect, useState } from 'react'
import { getStoredSettings, saveSettings } from '../services/SettingsService'
import type { UserSettings, NotificationSettings, AppearanceSettings, SoundPalette } from '../services/SettingsService'
import { getStoredToken } from '../lib/auth'
import { updatePreferencesRequest } from '../lib/authApi'

// Ayarlar sayfalarının (language/notifications/appearance) her birinin
// bağımsız olarak yaptığı "oku -> birleştir -> yaz" deseni burada tek
// yerde toplandı.
export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null)

  useEffect(() => {
    setSettings(getStoredSettings())
  }, [])

  const updateLanguage = useCallback((code: string) => {
    setSettings((prev) => {
      const current = prev ?? getStoredSettings()
      const next = { ...current, language: code }
      saveSettings(next)
      return next
    })
  }, [])

  const updateNotifications = useCallback((key: keyof NotificationSettings, value: boolean) => {
    setSettings((prev) => {
      const current = prev ?? getStoredSettings()
      const next = { ...current, notifications: { ...current.notifications, [key]: value } }
      saveSettings(next)
      // Sunucudaki soğuma hatırlatma job'ı (bkz. server/src/jobs/
      // cooldownReminder.js) bu tercihi kullanıyor - gerçek hesapta
      // (token varsa) best-effort senkronluyoruz, misafirde hiç çağrılmıyor.
      if (key === 'dailyRitualReminder') {
        const token = getStoredToken()
        if (token) {
          updatePreferencesRequest(token, { notificationPrefs: { [key]: value } }).catch(() => {})
        }
      }
      return next
    })
  }, [])

  const updateSound = useCallback((palette: SoundPalette) => {
    setSettings((prev) => {
      const current = prev ?? getStoredSettings()
      const next = { ...current, sound: { ...current.sound, palette } }
      saveSettings(next)
      return next
    })
  }, [])

  const updateAppearance = useCallback((appearance: AppearanceSettings) => {
    setSettings((prev) => {
      const current = prev ?? getStoredSettings()
      const next = { ...current, appearance }
      saveSettings(next)
      return next
    })
  }, [])

  return { settings, updateLanguage, updateNotifications, updateSound, updateAppearance }
}
