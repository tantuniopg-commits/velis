'use client'

import { useEffect, useState } from 'react'
import { SettingsShell, SettingsCard, SettingsRow, Toggle, SANS } from '../shared'
import type { NotificationSettings } from '../../../services/SettingsService'
import { useSettings } from '../../../hooks/useSettings'
import { useLocale } from '../../../contexts/LocaleContext'
import {
  getNotificationPrefs,
  enablePushNotifications,
  disablePushNotifications,
  getPermissionStatus,
  openSystemSettings,
} from '../../../services/notifications'

const noteStyle = { margin: '2px 20px 14px', fontFamily: SANS, fontSize: '12px', lineHeight: 1.4, color: '#8F8A83' }

// Faz 2 (bkz. AGENTS.md "Bildirimler") - kullanıcı hiçbir saat/tür
// seçmiyor, tek bir "Bildirimler" anahtarı var. Ne zaman/ne gönderileceğine
// sunucu karar veriyor (her gün 09:00/15:00/21:00, gece hiç yok).
export default function NotificationSettingsPage() {
  const { t } = useLocale()
  const { settings, updateNotifications } = useSettings()
  const notifications = settings?.notifications

  const [pushEnabled, setPushEnabled] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setPushEnabled(getNotificationPrefs().enabled)
    getPermissionStatus().then((status) => setPermissionDenied(status === 'denied'))
  }, [])

  const togglePush = async (next: boolean) => {
    setBusy(true)
    if (next) {
      const ok = await enablePushNotifications()
      setPushEnabled(ok)
      setPermissionDenied(!ok)
    } else {
      disablePushNotifications()
      setPushEnabled(false)
    }
    setBusy(false)
  }

  const toggleEmail = (key: keyof NotificationSettings, next: boolean) => {
    updateNotifications(key, next)
  }

  if (!notifications) return <SettingsShell title={t('settings.notifications.title')}>{null}</SettingsShell>

  return (
    <SettingsShell title={t('settings.notifications.title')}>
      <SettingsCard>
        <SettingsRow
          label={t('settings.notifications.dailyRitualReminder')}
          chevron={false}
          first
          rightElement={<Toggle checked={notifications.dailyRitualReminder} onChange={(next) => toggleEmail('dailyRitualReminder', next)} />}
        />
        <p style={noteStyle}>{t('settings.notifications.dailyRitualReminder.note')}</p>
      </SettingsCard>

      <SettingsCard title={t('settings.notifications.push.title')}>
        {permissionDenied && (
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontFamily: SANS, fontSize: '13px', color: '#E39C8C' }}>{t('settings.notifications.push.permissionOff')}</span>
            <button
              onClick={openSystemSettings}
              style={{
                alignSelf: 'flex-start',
                padding: '8px 16px',
                borderRadius: '999px',
                border: '1px solid rgba(255, 178, 90, 0.4)',
                background: 'rgba(255, 178, 90, 0.06)',
                color: '#E3C08C',
                fontFamily: SANS,
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {t('settings.notifications.push.openSettings')}
            </button>
          </div>
        )}
        <SettingsRow
          label={t('settings.notifications.push.toggle')}
          chevron={false}
          first={!permissionDenied}
          rightElement={<Toggle checked={pushEnabled} onChange={togglePush} />}
        />
        <p style={noteStyle}>{t(busy ? 'settings.notifications.push.updating' : 'settings.notifications.push.note')}</p>
      </SettingsCard>
    </SettingsShell>
  )
}
