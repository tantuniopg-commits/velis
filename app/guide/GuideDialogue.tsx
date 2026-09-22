'use client'

import { useEffect, useRef, useState } from 'react'
import { FONT_SANS } from '../lib/typography'

const CARD_FADE_MS = 300
const CHAR_MS = 25
const SWAP_MS = 150

// <GuideDialogue /> - a floating, luxury message card (no speech-bubble
// tail, no comic styling). The card fades AND expands in (300ms), THEN the
// typewriter starts. Once a line finishes typing, it waits for the user to
// TAP the card - the old line fades out and the next one types in (never
// both at once, never an automatic timer). Tapping the last line calls
// onDone(). A line may contain a "\n" - the part before it reads as the
// main sentence (larger, semibold), the rest as a smaller supporting line.
// onTypingChange lets the guide's head glow subtly brighter while a
// character is still appearing.
export default function GuideDialogue({
  lines,
  onDone,
  onTypingChange,
  hint,
}: {
  lines: string[]
  onDone?: () => void
  onTypingChange?: (typing: boolean) => void
  // Sadece turun İLK sahnesinde (bkz. WelcomeScreen.tsx) geçiliyor - kartın
  // altında küçük, silik bir "kutucuğa dokun" ipucu. Kullanıcı etkileşimi
  // henüz öğrenmediği tek an burası; sonraki her sahnede zaten biliyor,
  // ipucu tekrar gösterilmiyor.
  hint?: string
}) {
  const [cardVisible, setCardVisible] = useState(false)
  const [lineIndex, setLineIndex] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [swapping, setSwapping] = useState(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const onTypingChangeRef = useRef(onTypingChange)
  onTypingChangeRef.current = onTypingChange

  useEffect(() => {
    setCardVisible(false)
    setLineIndex(0)
    setCharCount(0)
    setSwapping(false)
    const t = setTimeout(() => setCardVisible(true), 20)
    return () => clearTimeout(t)
  }, [lines])

  useEffect(() => {
    if (!cardVisible || swapping) return
    const line = lines[lineIndex] ?? ''
    if (charCount < line.length) {
      onTypingChangeRef.current?.(true)
      const t = setTimeout(() => setCharCount((c) => c + 1), CHAR_MS)
      return () => clearTimeout(t)
    }
    // Satır tamamlandı - artık kullanıcının dokunuşunu bekliyor, otomatik
    // ilerleme yok.
    onTypingChangeRef.current?.(false)
  }, [cardVisible, swapping, lineIndex, charCount, lines])

  const line = lines[lineIndex] ?? ''
  const lineDone = charCount >= line.length
  const typing = cardVisible && !swapping && !lineDone

  const handleTap = () => {
    if (!cardVisible || swapping || !lineDone) return
    if (lineIndex >= lines.length - 1) {
      onDoneRef.current?.()
      return
    }
    setSwapping(true)
    setTimeout(() => {
      setLineIndex((i) => i + 1)
      setCharCount(0)
      setSwapping(false)
    }, SWAP_MS)
  }

  const revealed = line.slice(0, charCount)
  const newlineIdx = revealed.indexOf('\n')
  const mainPart = newlineIdx === -1 ? revealed : revealed.slice(0, newlineIdx)
  const supportPart = newlineIdx === -1 ? '' : revealed.slice(newlineIdx + 1)
  const typingMain = typing && newlineIdx === -1
  const typingSupport = typing && newlineIdx !== -1

  const mainStyle = {
    fontFamily: FONT_SANS,
    fontWeight: 400,
    fontSize: '15px',
    lineHeight: '21px',
    letterSpacing: '-0.2px',
    color: '#F4F1EB',
    textAlign: 'left' as const,
    whiteSpace: 'pre-line' as const,
    minHeight: '21px',
    opacity: swapping ? 0 : 1,
    transition: `opacity ${SWAP_MS}ms ease-in-out`,
  }

  const supportStyle = {
    fontFamily: FONT_SANS,
    fontWeight: 400,
    fontSize: '16px',
    lineHeight: 1.35,
    letterSpacing: '-0.2px',
    color: 'rgba(244, 241, 235, 0.75)',
    textAlign: 'left' as const,
    whiteSpace: 'pre-line' as const,
    marginTop: '6px',
    opacity: swapping ? 0 : 1,
    transition: `opacity ${SWAP_MS}ms ease-in-out`,
  }

  return (
    <div>
      <div
        onClick={handleTap}
        style={{
          maxWidth: '290px',
          padding: '22px',
          borderRadius: '24px',
          background: 'rgba(21, 17, 15, 0.9)',
          border: '1px solid rgba(200, 155, 90, 0.25)',
          boxShadow: '0 0 30px 2px rgba(200, 155, 90, 0.12), 0 20px 44px rgba(0, 0, 0, 0.4)',
          opacity: cardVisible ? 1 : 0,
          transform: cardVisible ? 'scale(1)' : 'scale(0.94)',
          transformOrigin: 'left center',
          transition: `opacity ${CARD_FADE_MS}ms ease-in-out, transform ${CARD_FADE_MS}ms ease-in-out`,
          pointerEvents: 'auto',
          cursor: lineDone ? 'pointer' : 'default',
        }}
      >
        <div style={mainStyle}>
          {mainPart}
          {typingMain && <span style={{ opacity: 0.5 }}>|</span>}
        </div>
        {(supportPart || typingSupport) && (
          <div style={supportStyle}>
            {supportPart}
            {typingSupport && <span style={{ opacity: 0.5 }}>|</span>}
          </div>
        )}
      </div>
      {hint && (
        <div
          aria-hidden
          style={{
            marginTop: '10px',
            padding: '0 6px',
            fontFamily: FONT_SANS,
            fontWeight: 400,
            fontSize: '11px',
            letterSpacing: '0.2px',
            color: 'rgba(244, 241, 235, 0.34)',
            textAlign: 'left',
            opacity: cardVisible ? 1 : 0,
            transition: `opacity ${CARD_FADE_MS}ms ease-in-out`,
            pointerEvents: 'none',
          }}
        >
          {hint}
        </div>
      )}
    </div>
  )
}
