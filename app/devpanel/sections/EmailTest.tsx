'use client'

import { useState } from 'react'
import SectionCard from '../SectionCard'
import { buttonStyle, colors, SANS } from '../styles'
import { getStoredToken } from '../../lib/auth'
import { sendTestEmailRequest } from '../../lib/authApi'

// OTP/parola sıfırlama e-postaları başarısız olduğunda kullanıcıya sadece
// jenerik "tekrar dene" döner (bkz. otpController.js) - gerçek sağlayıcı
// hatasını (SendGrid/Resend) Render loglarına girmeden görmek için bu kendi
// hesabına anında bir test maili gönderiyor (bkz. push-test'in aynısı).
export default function EmailTestSection() {
  const [status, setStatus] = useState<string>('')
  const [busy, setBusy] = useState(false)

  const send = async () => {
    if (busy) return
    setBusy(true)
    try {
      const token = getStoredToken()
      if (!token) {
        setStatus('Sign in first.')
        return
      }
      const res = await sendTestEmailRequest(token)
      setStatus(`Sent via ${res.provider} to ${res.to}.`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SectionCard title="Email">
      <p style={{ margin: 0, fontFamily: SANS, fontSize: '12px', color: colors.muted }}>
        Sends a test email to your own account&apos;s address right now, through whichever provider is configured.
      </p>
      <button style={buttonStyle('primary')} onClick={send} disabled={busy}>
        Send test email
      </button>
      {status && <p style={{ margin: 0, fontFamily: SANS, fontSize: '12px', color: colors.muted }}>{status}</p>}
    </SectionCard>
  )
}
