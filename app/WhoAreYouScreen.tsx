'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { FONT_SANS, textColor } from './lib/typography'
import type { UserType } from './lib/onboarding'
import { useLocale } from './contexts/LocaleContext'

// "Who are you?" ekranı - Intro'dan hemen sonra, Welcome'dan ÖNCE, sadece
// ilk açılışta bir kez soruluyor (bkz. lib/onboarding.ts getUserType/
// saveUserType, app/page.tsx HomeInner). Seçim yapılınca ~300ms bekleyip
// otomatik ilerliyor - Continue butonu ya da onay yok (spec gereği).

const CARD_SIZE = 132

// İkon çizimlerinin görsel sınırlayıcı kutusu 48x48 viewBox'ın tam ortasında
// değil - dıştaki daire flex ile SVG kutusunu ortalıyor ama çizimin kendisi
// kutunun içinde kaçık duruyordu. <g translate> ile çizimi gerçek merkezine
// kaydırıyoruz (bkz. ChoiceCard / profile StatusCard - her ikisi de bu
// bileşenleri kullanıyor).
export function LeafIcon({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="#E3C08C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <g transform="translate(5 3)">
        <path d="M14 34C10 24 14 12 30 10c4 10 0 22-10 26-4 1.6-4.6 0-6-2Z" />
        <path d="M16 32c4-6 9-11 14-16" />
      </g>
    </svg>
  )
}

export function CigaretteIcon({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="#E3C08C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <g transform="translate(3 5.5)">
        <path d="M9 27h22a4 4 0 0 0 4-4 4 4 0 0 0-4-4H9a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2Z" />
        <path d="M31 21v6" />
        <path d="M20 12c1.4 1 2 2.4 1.6 4M25 10c1.8 1.2 2.6 3 2 5" opacity="0.7" />
      </g>
    </svg>
  )
}

function ChoiceCard({
  label,
  description,
  icon,
  selected,
  dimmed,
  onTap,
}: {
  label: string
  description: string
  icon: ReactNode
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
        {icon}
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
      <div
        style={{
          marginTop: '8px',
          fontFamily: FONT_SANS,
          fontWeight: 400,
          fontSize: '13px',
          lineHeight: 1.4,
          color: textColor.secondary,
          textAlign: 'center',
          whiteSpace: 'pre-line',
        }}
      >
        {description}
      </div>
    </div>
  )
}

export default function WhoAreYouScreen({ onChoose }: { onChoose: (type: UserType) => void }) {
  const { t } = useLocale()
  const [selected, setSelected] = useState<UserType | null>(null)

  const handleTap = (type: UserType) => {
    if (selected) return
    setSelected(type)
    // onChoose HEMEN çağrılıyor - eskiden araya SELECT_DELAY_MS'lik bir
    // setTimeout giriyordu ama o zamanlayıcı iPad WKWebView'de kaybolursa
    // ekran tam-ekran takılı kalıp sonraki adıma hiç geçmiyordu.
    onChoose(type)
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
      {/* Çok hafif konsantrik halkalar - dekoratif değil, sadece "lüks" bir zemin hissi (bkz. spec: ~%5 opaklık). */}
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
        {t('whoAreYou.title')}
      </h1>
      <p
        style={{
          marginTop: '10px',
          fontFamily: FONT_SANS,
          fontWeight: 400,
          fontSize: '14px',
          lineHeight: 1.4,
          color: textColor.secondary,
          textAlign: 'center',
          whiteSpace: 'pre-line',
        }}
      >
        {t('whoAreYou.subtitle')}
      </p>

      <div style={{ marginTop: '56px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
        <ChoiceCard
          label={t('whoAreYou.nonsmoker.label')}
          description={t('whoAreYou.nonsmoker.description')}
          icon={<LeafIcon />}
          selected={selected === 'Nonsmoker'}
          dimmed={selected !== null && selected !== 'Nonsmoker'}
          onTap={() => handleTap('Nonsmoker')}
        />
        <ChoiceCard
          label={t('whoAreYou.smoker.label')}
          description={t('whoAreYou.smoker.description')}
          icon={<CigaretteIcon />}
          selected={selected === 'Smoker'}
          dimmed={selected !== null && selected !== 'Smoker'}
          onTap={() => handleTap('Smoker')}
        />
      </div>

      <div style={{ flex: 1 }} />
    </div>
  )
}
