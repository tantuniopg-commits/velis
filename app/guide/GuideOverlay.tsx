'use client'

import { useEffect, useState } from 'react'
import { FONT_SANS } from '../lib/typography'
import { useLocale } from '../contexts/LocaleContext'
import VelisGuide from './VelisGuide'
import GuideDialogue from './GuideDialogue'

const APPEAR_MS = 900
const GUIDE_W = 50
const SIDE_GAP = 20
// Son satıra dokunulduktan sonra TÜM katman (rehber + kart + loşluk) birlikte
// hızlıca sönüyor ve hemen unmount oluyor - eskiden rehber figürü %70
// opaklıkta yarım saniye asılı kalıyordu, "iş bitti ama gitmedi" hissi
// veriyordu. Fade süresi + küçük bir tampon kadar.
const FADE_OUT_MS = 200

// Rehber SADECE turdaki İLK kez yavaşça beliriyor - sonraki her adımda
// (ekran/step değişse bile) doğrudan tam görünür başlıyor, "sabit kalıyor"
// hissi veriyor; sadece kart içindeki metin değişiyor. Modül seviyesinde,
// oturum boyunca kalıcı (bkz. introPlayed deseni) - tam sayfa yenilemesinde
// sıfırlanıyor, bu da beklenen/kabul edilebilir.
let guideEverAppeared = false

// <GuideOverlay /> - the whole "focus system" in one place: dims/blurs
// everything, punches a soft-glowing "spotlight" hole over the target
// element (via a giant box-shadow - no per-sibling filtering needed), and
// shows the guide figure + message card as one group: guide on the left,
// card beside it, vertically centered together. `guidePlacement="center"`
// centers that group in the viewport (used when there's no single obvious
// target, e.g. Welcome); the default keeps it in a fixed, safe bottom zone.
// The spotlight layer is pointer-events:none - the real, live element
// underneath stays fully interactive through the dim. Once the message is
// fully acknowledged (last line tapped), onDialogueDone fires IMMEDIATELY
// (the parent unmounts it) while the layer fades out (FADE_OUT_MS). No
// lingering half-opacity figure: when the guide is done talking, it's gone.
export default function GuideOverlay({
  targetRect,
  lines,
  pointing = false,
  guidePlacement = 'bottom',
  guideSize,
  onDialogueDone,
  onSkip,
}: {
  targetRect: DOMRect | null
  lines: string[]
  pointing?: boolean
  guidePlacement?: 'bottom' | 'center'
  guideSize?: number
  onDialogueDone?: () => void
  onSkip: () => void
}) {
  const { t } = useLocale()
  const guideCentered = guidePlacement === 'center'
  // Rehber sayfada aniden belirmiyor - hem loş katman hem figür/diyalog
  // birlikte, yavaşça (bkz. spec: "yavaşça gözüksün") - ama SADECE turun
  // ilk adımında. Sonraki adımlarda zaten "orada" - tekrar belirmiyor.
  const [appeared, setAppeared] = useState(guideEverAppeared)
  useEffect(() => {
    if (guideEverAppeared) return
    const t = setTimeout(() => {
      guideEverAppeared = true
      setAppeared(true)
    }, 20)
    return () => clearTimeout(t)
  }, [])
  // Metin yazılırken kafa hafifçe parlaklaşıyor, bitince normale dönüyor.
  const [speaking, setSpeaking] = useState(false)
  // Mesaj tamamen bitip kabul edilince (son satıra dokununca) - kart/loş
  // katman kayboluyor VE onDialogueDone HEMEN çağrılıyor. Eskiden araya bir
  // setTimeout(SETTLE_MS) giriyordu ama o zamanlayıcı iPad WKWebView'de
  // kaybolursa çağrı hiç gelmiyor, çağıran ekran (ör. WelcomeScreen) görünmez
  // bir tam-ekran katman olarak takılı kalıyordu (App Review 2.1a). Settle
  // fade'i `settled` state'iyle yine oynuyor, sadece callback'i bekletmiyor.
  const [settled, setSettled] = useState(false)
  const handleMessageDone = () => {
    setSettled(true)
    onDialogueDone?.()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 900,
        pointerEvents: 'none',
        opacity: settled ? 0 : appeared ? 1 : 0,
        transition: settled
          ? `opacity ${FADE_OUT_MS}ms ease-in`
          : `opacity ${APPEAR_MS}ms ease-in-out`,
      }}
    >
      {targetRect ? (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            top: targetRect.top - 10,
            left: targetRect.left - 10,
            width: targetRect.width + 20,
            height: targetRect.height + 20,
            borderRadius: '20px',
            boxShadow: '0 0 0 9999px rgba(5, 5, 5, 0.72)',
            outline: '1px solid rgba(216, 174, 108, 0.45)',
            filter: 'drop-shadow(0 0 18px rgba(216, 174, 108, 0.25))',
            opacity: settled ? 0 : 1,
            transition:
              'top 250ms ease-out, left 250ms ease-out, width 250ms ease-out, height 250ms ease-out, opacity 400ms ease-in-out',
          }}
        />
      ) : (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 5, 5, 0.72)',
            opacity: settled ? 0 : 1,
            transition: 'opacity 400ms ease-in-out',
          }}
        />
      )}

      {!settled && (
        <button
          onClick={onSkip}
          style={{
            position: 'fixed',
            top: 'calc(12px + env(safe-area-inset-top))',
            right: 'calc(20px + env(safe-area-inset-right))',
            padding: '8px 10px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            pointerEvents: 'auto',
            fontFamily: FONT_SANS,
            fontWeight: 500,
            fontSize: '14px',
            color: 'rgba(245, 240, 234, 0.6)',
          }}
        >
          {t('guide.skip')}
        </button>
      )}

      {targetRect ? (
        <>
          {/* Rehber objenin SOLUNDA, dikey merkezi objeyle hizalı. */}
          <div
            style={{
              position: 'fixed',
              top: targetRect.top + targetRect.height / 2,
              left: Math.max(12, targetRect.left - GUIDE_W - SIDE_GAP),
              transform: 'translateY(-50%)',
              transition: 'top 250ms ease-out, left 250ms ease-out',
            }}
          >
            <VelisGuide pointing={pointing} speaking={speaking} opacity={1} size={guideSize ?? GUIDE_W} />
          </div>
          {/* Mesaj kartı objenin SAĞINDA - objeyi asla örtmüyor. */}
          <div
            style={{
              position: 'fixed',
              top: targetRect.top + targetRect.height / 2,
              left: targetRect.right + SIDE_GAP,
              maxWidth: `calc(100vw - ${targetRect.right + SIDE_GAP + 16}px)`,
              transform: 'translateY(-50%)',
              opacity: settled ? 0 : 1,
              pointerEvents: settled ? 'none' : 'auto',
              transition: 'top 250ms ease-out, left 250ms ease-out, opacity 400ms ease-in-out',
            }}
          >
            <GuideDialogue lines={lines} onDone={handleMessageDone} onTypingChange={setSpeaking} />
          </div>
        </>
      ) : (
        <div
          style={
            guideCentered
              ? {
                  position: 'fixed',
                  top: '50%',
                  left: 0,
                  right: 0,
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '20px',
                  padding: '0 24px',
                }
              : {
                  position: 'fixed',
                  bottom: 'calc(120px + env(safe-area-inset-bottom))',
                  left: 0,
                  right: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '20px',
                  padding: '0 24px',
                }
          }
        >
          {/* Rehber solda, mesaj kartı yanında (kafanın sağ-üstünde) - rehber
              kartın DÜŞEY merkeziyle hizalı. */}
          <VelisGuide pointing={pointing} reaching speaking={speaking} opacity={1} size={guideSize} />
          <div
            style={{
              opacity: settled ? 0 : 1,
              pointerEvents: settled ? 'none' : 'auto',
              transition: 'opacity 400ms ease-in-out',
            }}
          >
            <GuideDialogue lines={lines} onDone={handleMessageDone} onTypingChange={setSpeaking} />
          </div>
        </div>
      )}
    </div>
  )
}
