'use client'

import { useState } from 'react'
import { FONT_SANS, textColor } from './lib/typography'
import { useLocale } from './contexts/LocaleContext'
import type { LocaleCode } from './lib/i18n'

// İlk açılışta, Intro'dan hemen sonra, "Who are you?"dan ÖNCE - sadece bir
// kez gösteriliyor (bkz. lib/onboarding.ts hasSelectedLanguage/
// markLanguageSelected, app/page.tsx HomeInner). Henüz hiçbir dil
// seçilmediği için başlık/alt yazı KASITLI OLARAK i18n sözlüğünden değil,
// doğrudan iki dilde (EN üstte, TR altta) yazılıyor - WhoAreYouScreen ile
// aynı görsel dil (VELIS wordmark, halka dekorasyonu, dairesel seçim
// kartları, 300ms seçim gecikmesi).

const CARD_SIZE = 132

function LetterMark({ text }: { text: string }) {
  return (
    <span
      style={{
        fontFamily: FONT_SANS,
        fontWeight: 700,
        fontSize: '30px',
        letterSpacing: '1px',
        color: '#E3C08C',
      }}
    >
      {text}
    </span>
  )
}

function LanguageCard({
  code,
  mark,
  label,
  selected,
  dimmed,
  onTap,
}: {
  code: LocaleCode
  mark: string
  label: string
  selected: boolean
  dimmed: boolean
  onTap: () => void
}) {
  return (
    <div
      onClick={onTap}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: `${CARD_SIZE + 20}px`,
        cursor: 'pointer',
        opacity: dimmed ? 0.4 : 1,
        transition: 'opacity 250ms ease',
      }}
    >
      <div
        style={{
          width: `${CARD_SIZE}px`,
          height: `${CARD_SIZE}px`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.02)',
          border: `1px solid ${selected ? 'rgba(243, 201, 139, 0.9)' : 'rgba(227, 192, 140, 0.35)'}`,
          boxShadow: selected ? '0 0 26px 4px rgba(243, 201, 139, 0.35)' : '0 0 10px 0px rgba(227, 192, 140, 0.08)',
          transform: selected ? 'scale(1.06)' : 'scale(1)',
          transition: 'transform 250ms ease, border 250ms ease, box-shadow 250ms ease',
        }}
      >
        <LetterMark text={mark} />
      </div>
      <div
        style={{
          marginTop: '18px',
          fontFamily: FONT_SANS,
          fontWeight: 600,
          fontSize: '17px',
          color: textColor.primary,
          textAlign: 'center',
        }}
      >
        {label}
      </div>
    </div>
  )
}

export default function LanguageSelectScreen({ onChoose }: { onChoose: (locale: LocaleCode) => void }) {
  const { setLocale } = useLocale()
  const [selected, setSelected] = useState<LocaleCode | null>(null)

  const handleTap = (code: LocaleCode) => {
    if (selected) return
    setSelected(code)
    setLocale(code)
    // onChoose HEMEN - eskiden araya SELECT_DELAY_MS'lik bir setTimeout
    // giriyordu; o zamanlayıcı iPad WKWebView'de kaybolursa ekran tam-ekran
    // takılı kalıp sonraki adıma geçmiyordu (App Review 2.1a deseni).
    onChoose(code)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        background: '#050505',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '72px 24px 48px',
        opacity: 1,
        transition: 'opacity 250ms ease',
      }}
    >
      {/* Çok hafif konsantrik halkalar - WhoAreYouScreen ile aynı dekoratif zemin. */}
      <svg
        aria-hidden
        viewBox="0 0 393 500"
        style={{ position: 'absolute', top: '140px', left: '50%', transform: 'translateX(-50%)', width: '360px', height: '360px', opacity: 0.05 }}
      >
        <circle cx="196.5" cy="180" r="90" stroke="#E3C08C" strokeWidth="1" fill="none" />
        <circle cx="196.5" cy="180" r="130" stroke="#E3C08C" strokeWidth="1" fill="none" />
        <circle cx="196.5" cy="180" r="170" stroke="#E3C08C" strokeWidth="1" fill="none" />
      </svg>

      <div
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 600,
          fontSize: '13px',
          letterSpacing: '6px',
          color: textColor.accent,
        }}
      >
        VELIS
      </div>

      <h1
        style={{
          marginTop: '32px',
          fontFamily: FONT_SANS,
          fontWeight: 600,
          fontSize: '26px',
          color: textColor.primary,
          textAlign: 'center',
        }}
      >
        Welcome to VELIS
      </h1>
      <p
        style={{
          marginTop: '10px',
          fontFamily: FONT_SANS,
          fontWeight: 400,
          fontSize: '14px',
          lineHeight: 1.5,
          color: textColor.secondary,
          textAlign: 'center',
        }}
      >
        Before we start, choose your language.
        <br />
        Başlamadan önce, dilinizi seçin.
      </p>

      <div style={{ marginTop: '56px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
        <LanguageCard
          code="en"
          mark="EN"
          label="English"
          selected={selected === 'en'}
          dimmed={selected !== null && selected !== 'en'}
          onTap={() => handleTap('en')}
        />
        <LanguageCard
          code="tr"
          mark="TR"
          label="Türkçe"
          selected={selected === 'tr'}
          dimmed={selected !== null && selected !== 'tr'}
          onTap={() => handleTap('tr')}
        />
      </div>

      <div style={{ flex: 1 }} />
    </div>
  )
}
