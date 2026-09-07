'use client'

import { useEffect, useRef, useState } from 'react'
import type { UserType } from './lib/onboarding'
import { FONT_SANS, textColor } from './lib/typography'
import { isGuideCompleted, setGuideCompleted } from './lib/guide'
import { getWelcomeLines } from './guide/guideScript'
import GuideOverlay from './guide/GuideOverlay'
import { useLocale } from './contexts/LocaleContext'

// First-launch-only ekran - IntroSplash bittikten hemen sonra, ilk
// ritüelden ÖNCE. Kendi metni ve butonu yok artık - TEK içerik VELIS Guide
// (bkz. guide/guideScript.ts WELCOME_LINES, Smoker/Nonsmoker'a göre farklı).
// Guide son satırına dokunulunca (bu zaten "anladım" dokunuşu) KENDİLİĞİNDEN
// devam ediyor - ayrıca bir "boşa dokunuş" beklemiyor.
//
// NOT: Eskiden çıkışta bir setTimeout ile fade yapıyordu. O zamanlayıcı
// iPad WKWebView'de tetiklenmezse ekran opacity:0 ama tam ekran kalıp TÜM
// dokunuşları yutuyordu (arkadaki ritüel ekranı görünür ama tıklanamaz -
// App Review 2.1a "unresponsive after onboarding"). Artık onContinue()
// doğrudan çağrılıyor; geçiş yumuşaklığını Landing'in kendi mount fade'i
// sağlıyor.

export default function WelcomeScreen({ onContinue, userType }: { onContinue: () => void; userType: UserType }) {
  const { locale } = useLocale()
  // VELIS Guide - sadece gerçek ilk kullanıcıda, "tamamlandı" bayrağı
  // set edilene (Skip veya son adım) kadar hiç kaybolmuyor.
  const [showGuide, setShowGuide] = useState(false)
  const donRef = useRef(false)

  const handleContinue = () => {
    if (donRef.current) return
    donRef.current = true
    onContinue()
  }

  useEffect(() => {
    if (isGuideCompleted()) {
      // Rehber daha önce tamamlanmış/Skip edilmiş - gösterilecek hiçbir şey
      // yok, ekranda takılı kalmamak için hemen devam ediyor.
      handleContinue()
      return
    }
    setShowGuide(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        background: '#050505',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 'calc(56px + env(safe-area-inset-top))',
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: FONT_SANS,
          fontWeight: 600,
          fontSize: '13px',
          letterSpacing: '6px',
          color: textColor.accent,
        }}
      >
        VELIS
      </div>

      {showGuide && (
        <GuideOverlay
          targetRect={null}
          guidePlacement="center"
          guideSize={70}
          lines={getWelcomeLines(userType, locale)}
          onDialogueDone={() => handleContinue()}
          onSkip={() => {
            setGuideCompleted()
            handleContinue()
          }}
        />
      )}
    </div>
  )
}
