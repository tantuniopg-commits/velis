'use client'

import { useEffect, useState } from 'react'
import type { VelisUser } from '../lib/auth'
import { getStoredUser, isAdminUser } from '../services/AuthService'
import { colors, SANS, SANS_DISPLAY } from './styles'
import { isDev } from '../constants/env'

import AppStatusSection from './sections/AppStatus'
import AppLifecycleSection from './sections/AppLifecycle'
import PushTestSection from './sections/PushTest'
import UserDatabaseSection from './sections/UserDatabase'
import VerificationSection from './sections/Verification'
import LiveJourneyStateSection from './sections/LiveJourneyState'
import JourneyControlsSection from './sections/JourneyControls'
import CooldownSection from './sections/Cooldown'
import RitualSection from './sections/Ritual'
import RitualConfigSection from './sections/RitualConfig'
import XPSection from './sections/XP'
import JourneyPreviewSection from './sections/JourneyPreview'
import MessageEditorSection from './sections/MessageEditor'
import TimeMachineSection from './sections/TimeMachine'
import AnimationsSection from './sections/Animations'
import ResetSection from './sections/Reset'

// VELIS Developer Panel - lokal geliştirmede (isDev) VEYA üretimde giriş
// yapmış kullanıcının e-postası sunucudaki admin listesindeyse (isAdminUser,
// bkz. server/src/lib/admins.js) açılıyor. Her iki durumda da Profile
// sayfasındaki 7-dokunuş jesti ile tetikleniyor. Normal kullanıcılar asla
// göremiyor/açamıyor.
//
// Her bölüm kendi dosyasında, modüler ve kendi state'ini yönetiyor (bkz.
// ./sections/*). Hepsi AYNI lib/ servislerini (auth, journey, time,
// devCooldown, leaderboardData, journeyContentOverrides) kullanıyor -
// gerçek uygulamanın kullandığı depolama/iş kuralı katmanının birebir aynısı.
export default function DevPanel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [user, setUser] = useState<VelisUser | null>(null)

  useEffect(() => {
    if (visible) setUser(getStoredUser())
  }, [visible])

  if ((!isDev && !isAdminUser()) || !visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: colors.background,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 20px 16px',
          borderBottom: `1px solid ${colors.divider}`,
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontFamily: SANS_DISPLAY, fontWeight: 600, fontSize: '17px', color: colors.white }}>Developer Panel</div>
          <div style={{ fontFamily: SANS, fontSize: '11px', color: colors.muted, marginTop: '2px' }}>
            Internal testing tool - never visible to normal users
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: '13px',
            color: colors.amber,
            background: 'rgba(255, 178, 90, 0.08)',
            border: '1px solid rgba(255, 178, 90, 0.3)',
            borderRadius: '999px',
            padding: '8px 18px',
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 20px 60px',
          display: 'flex',
          flexDirection: 'column',
          gap: '22px',
          maxWidth: '640px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        <AppStatusSection user={user} />
        <AppLifecycleSection />
        <PushTestSection />
        <UserDatabaseSection />
        <VerificationSection />
        <LiveJourneyStateSection />
        <JourneyControlsSection />
        <CooldownSection />
        <RitualConfigSection />
        <RitualSection onNavigate={onClose} />
        <XPSection />
        <JourneyPreviewSection onNavigate={onClose} />
        <MessageEditorSection />
        <TimeMachineSection />
        <AnimationsSection onNavigate={onClose} />
        <ResetSection />
      </div>
    </div>
  )
}
