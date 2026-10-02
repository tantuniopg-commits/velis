'use client'

import { useState } from 'react'
import SectionCard from '../SectionCard'
import { buttonStyle, colors, SANS } from '../styles'
import { getStoredToken } from '../../lib/auth'
import { sendTestPushRequest } from '../../lib/authApi'
import { getPermissionStatus, enablePushNotifications } from '../../services/notifications'

// Zamanlanmış bildirimler sadece 09:00/15:00/21:00'de gidiyor (bkz.
// server/src/jobs/pushReminderJob.js) - kurulumu beklemeden doğrulamak için
// bu cihaza ANINDA bir test bildirimi. Önce izin + token kaydı, sonra gönder.
export default function PushTestSection() {
  const [status, setStatus] = useState<string>('')
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<string>) => {
    if (busy) return
    setBusy(true)
    try {
      setStatus(await fn())
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const enable = () =>
    run(async () => {
      const ok = await enablePushNotifications()
      return ok ? 'Permission granted - device token is being registered.' : `Not enabled (permission: ${await getPermissionStatus()}).`
    })

  const send = () =>
    run(async () => {
      const token = getStoredToken()
      if (!token) return 'Sign in first.'
      const res = await sendTestPushRequest(token)
      return res.sent > 0 ? 'Sent. Lock the phone or leave the app to see it.' : `Apple rejected it: ${res.failed.join(', ') || 'unknown'}`
    })

  return (
    <SectionCard title="Push Notifications">
      <p style={{ margin: 0, fontFamily: SANS, fontSize: '12px', color: colors.muted }}>
        Scheduled pushes go out at 09:00 / 15:00 / 21:00 (TR). Use this to send one to this device right now.
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button style={buttonStyle()} onClick={enable} disabled={busy}>
          1. Enable
        </button>
        <button style={buttonStyle('primary')} onClick={send} disabled={busy}>
          2. Send test push
        </button>
      </div>
      {status && <p style={{ margin: 0, fontFamily: SANS, fontSize: '12px', color: colors.muted }}>{status}</p>}
    </SectionCard>
  )
}
