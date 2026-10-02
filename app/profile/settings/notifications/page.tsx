'use client'

import { useEffect, useState } from 'react'
import { SettingsShell, SettingsCard, SettingsRow, Toggle, SANS } from '../shared'
import type { NotificationSettings } from '../../../services/SettingsService'
import { useSettings } from '../../../hooks/useSettings'
import { useLocale } from '../../../contexts/LocaleContext'
import type { TranslationKey } from '../../../lib/i18n'
import {
  getNotificationPrefs,
  patchNotificationPrefs,
  rescheduleAllFromSettings,
  getPermissionStatus,
  requestPermissionFromSettings,
  openSystemSettings,
} from '../../../services/notifications'
import type { NotificationPrefs, TimeOfDay } from '../../../services/notifications'

const ROWS: { key: keyof NotificationSettings; labelKey: TranslationKey; noteKey: TranslationKey }[] = [
  { key: 'dailyRitualReminder', labelKey: 'settings.notifications.dailyRitualReminder', noteKey: 'settings.notifications.dailyRitualReminder.note' },
]

const inputStyle = {
  fontFamily: SANS,
  fontSize: '14px',
  color: '#F5F0EA',
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '10px',
  padding: '7px 10px',
  colorScheme: 'dark' as const,
}

const noteStyle = { margin: '2px 20px 14px', fontFamily: SANS, fontSize: '12px', lineHeight: 1.4, color: '#8F8A83' }

// Bir saat listesi düzenleyici (Ritüel hatırlatması / Zor an) - ekle/çıkar,
// her satır bir <input type="time"> (native seçici - cihazlar arası
// güvenilir, hızlı; kendi scroll-wheel bileşenimiz başka bir özellik için
// zaten var olup kaldırıldı, burada yeniden icat etmiyoruz).
function TimeListEditor({ times, onChange }: { times: TimeOfDay[]; onChange: (next: TimeOfDay[]) => void }) {
  const { t } = useLocale()
  return (
    <div style={{ padding: '4px 20px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {times.length === 0 && <span style={{ fontFamily: SANS, fontSize: '13px', color: '#8F8A83' }}>{t('settings.notifications.push.noTimes')}</span>}
      {times.map((time, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="time"
            value={time}
            onChange={(e) => {
              const next = [...times]
              next[i] = e.target.value
              onChange(next)
            }}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={() => onChange(times.filter((_, idx) => idx !== i))}
            aria-label="Remove"
            style={{ background: 'none', border: 'none', color: '#8F8A83', fontSize: '18px', cursor: 'pointer', padding: '4px 8px' }}
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...times, '09:00'])}
        style={{
          alignSelf: 'flex-start',
          marginTop: '2px',
          padding: '7px 14px',
          borderRadius: '999px',
          border: '1px solid rgba(255, 178, 90, 0.35)',
          background: 'rgba(255, 178, 90, 0.05)',
          color: '#E3C08C',
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: '13px',
          cursor: 'pointer',
        }}
      >
        + {t('settings.notifications.push.addTime')}
      </button>
    </div>
  )
}

export default function NotificationSettingsPage() {
  const { t } = useLocale()
  const { settings, updateNotifications } = useSettings()
  const notifications = settings?.notifications

  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)

  useEffect(() => {
    setPrefs(getNotificationPrefs())
    getPermissionStatus().then((status) => setPermissionDenied(status === 'denied'))
  }, [])

  const apply = (patch: Partial<NotificationPrefs>) => {
    const next = patchNotificationPrefs(patch)
    setPrefs(next)
    rescheduleAllFromSettings()
  }

  // Bir türü İLK kez açarken izin daha önce hiç istenmediyse/reddedildiyse
  // önce gerçek sistem iznini dener - kabul edilmezse toggle açılmıyor,
  // "kapalı" bandı gösteriliyor (bkz. permissionDenied).
  const enableWithPermission = async (patch: Partial<NotificationPrefs>) => {
    const status = await getPermissionStatus()
    if (status !== 'granted') {
      const result = await requestPermissionFromSettings()
      if (result !== 'granted') {
        setPermissionDenied(true)
        return
      }
    }
    setPermissionDenied(false)
    apply(patch)
  }

  const toggleEmail = (key: keyof NotificationSettings, next: boolean) => {
    updateNotifications(key, next)
  }

  if (!notifications || !prefs) return <SettingsShell title={t('settings.notifications.title')}>{null}</SettingsShell>

  return (
    <SettingsShell title={t('settings.notifications.title')}>
      <SettingsCard>
        {ROWS.map((row, i) => (
          <div key={row.key}>
            <SettingsRow
              label={t(row.labelKey)}
              chevron={false}
              first={i === 0}
              rightElement={<Toggle checked={notifications[row.key]} onChange={(next) => toggleEmail(row.key, next)} />}
            />
            <p style={noteStyle}>{t(row.noteKey)}</p>
          </div>
        ))}
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
          label={t('settings.notifications.push.ritualReminder')}
          chevron={false}
          first={!permissionDenied}
          rightElement={
            <Toggle
              checked={prefs.ritualReminder.enabled}
              onChange={(next) =>
                next
                  ? enableWithPermission({ ritualReminder: { ...prefs.ritualReminder, enabled: true } })
                  : apply({ ritualReminder: { ...prefs.ritualReminder, enabled: false } })
              }
            />
          }
        />
        <p style={noteStyle}>{t('settings.notifications.push.ritualReminder.note')}</p>
        {prefs.ritualReminder.enabled && (
          <TimeListEditor times={prefs.ritualReminder.times} onChange={(times) => apply({ ritualReminder: { ...prefs.ritualReminder, times } })} />
        )}

        <SettingsRow
          label={t('settings.notifications.push.hardMoment')}
          chevron={false}
          rightElement={
            <Toggle
              checked={prefs.hardMoment.enabled}
              onChange={(next) =>
                next
                  ? enableWithPermission({ hardMoment: { ...prefs.hardMoment, enabled: true } })
                  : apply({ hardMoment: { ...prefs.hardMoment, enabled: false } })
              }
            />
          }
        />
        <p style={noteStyle}>{t('settings.notifications.push.hardMoment.note')}</p>
        {prefs.hardMoment.enabled && (
          <>
            <TimeListEditor times={prefs.hardMoment.times} onChange={(times) => apply({ hardMoment: { ...prefs.hardMoment, times } })} />
            <div style={{ padding: '0 20px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontFamily: SANS, fontSize: '13px', color: '#8F8A83' }}>{t('settings.notifications.push.hardMoment.minutesBefore')}</span>
              <input
                type="number"
                min={1}
                max={120}
                value={prefs.hardMoment.minutesBefore}
                onChange={(e) => apply({ hardMoment: { ...prefs.hardMoment, minutesBefore: Math.max(1, Number(e.target.value) || 1) } })}
                style={{ ...inputStyle, width: '64px' }}
              />
            </div>
          </>
        )}

        <SettingsRow
          label={t('settings.notifications.push.milestone')}
          chevron={false}
          rightElement={
            <Toggle
              checked={prefs.milestone.enabled}
              onChange={(next) => (next ? enableWithPermission({ milestone: { enabled: true } }) : apply({ milestone: { enabled: false } }))}
            />
          }
        />
        <p style={noteStyle}>{t('settings.notifications.push.milestone.note')}</p>

        <SettingsRow
          label={t('settings.notifications.push.checkin')}
          chevron={false}
          rightElement={
            <Toggle
              checked={prefs.checkin.enabled}
              onChange={(next) => (next ? enableWithPermission({ checkin: { enabled: true } }) : apply({ checkin: { enabled: false } }))}
            />
          }
        />
        <p style={noteStyle}>{t('settings.notifications.push.checkin.note')}</p>

        <div style={{ padding: '16px 20px 4px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: '15px', color: '#F5F0EA' }}>{t('settings.notifications.push.quietHours')}</span>
        </div>
        <p style={{ ...noteStyle, marginTop: '2px' }}>{t('settings.notifications.push.quietHours.note')}</p>
        <div style={{ padding: '0 20px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="time"
            value={prefs.quietHours.start}
            onChange={(e) => apply({ quietHours: { ...prefs.quietHours, start: e.target.value } })}
            style={{ ...inputStyle, flex: 1 }}
          />
          <span style={{ color: '#8F8A83' }}>—</span>
          <input
            type="time"
            value={prefs.quietHours.end}
            onChange={(e) => apply({ quietHours: { ...prefs.quietHours, end: e.target.value } })}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
      </SettingsCard>
    </SettingsShell>
  )
}
