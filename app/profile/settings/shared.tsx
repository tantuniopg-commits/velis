'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

// Ayarlar sisteminin tüm alt sayfalarının paylaştığı kabuk/satır/anahtar
// bileşenleri - app/profile/page.tsx'teki mevcut tasarım diliyle BİREBİR
// aynı belirteçleri kullanıyor (aynı SANS/SANS_DISPLAY, aynı kart/satır
// stilleri) - profildeki mevcut içerik hiç değişmiyor, sadece bu yeni
// sistem aynı dili konuşuyor.

export const SANS = '"SF Pro Text", -apple-system, BlinkMacSystemFont, sans-serif'
export const SANS_DISPLAY = '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif'
export const SERIF = '"New York", Georgia, "Times New Roman", serif'

export function labelStyle(color: string) {
  return {
    fontFamily: SANS,
    fontWeight: 600 as const,
    fontSize: '11px',
    letterSpacing: '1px',
    textTransform: 'uppercase' as const,
    color,
  }
}

export const cardStyle = {
  width: '100%',
  maxWidth: '380px',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '20px',
  background: 'rgba(255, 255, 255, 0.02)',
  overflow: 'hidden',
}

// Metin girişi + kaydet düğmesi - Hesap ayarları ve Profil düzenleme ekranı
// (bkz. app/ProfileEditSheet.tsx) aynı alanları kullanıyor, tek yerde duruyor.
export function fieldInputStyle(focused: boolean, withRightSlot = false) {
  return {
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: withRightSlot ? '13px 44px 13px 16px' : '13px 16px',
    borderRadius: '14px',
    border: focused ? '1px solid rgba(255, 178, 90, 0.55)' : '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: focused ? '0 0 0 3px rgba(255, 178, 90, 0.1)' : 'none',
    background: 'rgba(255, 255, 255, 0.03)',
    color: '#F5F0EA',
    fontFamily: SANS,
    fontWeight: 400,
    fontSize: '15px',
    outline: 'none',
    transition: 'border 200ms ease-out, box-shadow 200ms ease-out',
  }
}

export const saveButtonStyle = {
  padding: '12px 0',
  borderRadius: '999px',
  border: '1px solid rgba(255, 178, 90, 0.45)',
  background: 'rgba(255, 178, 90, 0.06)',
  color: '#E3C08C',
  fontFamily: SANS,
  fontWeight: 600,
  fontSize: '14px',
  cursor: 'pointer',
}

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M15 5L8 12L15 19" stroke="#F5F0EA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M9 5L15 12L9 19" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CheckIcon({ color = '#F3CE8E' }: { color?: string }) {
  return (
    <svg width="14" height="12" viewBox="0 0 14 11" fill="none">
      <path d="M1 5.5L5 9.5L13 1.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Her ayarlar alt sayfası bu kabuğu kullanıyor: sol üstte geri butonu,
// ortalanmış başlık, aynı siyah zemin/dolgu. Sayfalar arası geçiş
// next.config.ts'teki global viewTransition ayarı üzerinden otomatik
// 400ms ease-in-out cross-fade ile oluyor - "Apple-like push" hissi
// buradan geliyor, ekstra bir animasyon kodu gerekmiyor.
// `backTo` varsayılan olarak Ayarlar listesine dönüyor ('/profile/settings')
// - "Account/Language/..." gibi detay sayfaları hep listeye geri dönüyor.
// Sadece listenin KENDİSİ (bkz. app/profile/settings/page.tsx) explicit
// olarak backTo="/profile" veriyor - Apple'daki gibi tek seviyeli, tutarlı
// bir gezinme hiyerarşisi.
export function SettingsShell({
  title,
  children,
  backTo = '/profile/settings',
}: {
  title: string
  children: ReactNode
  backTo?: string
}) {
  const router = useRouter()

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#050505',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '56px 20px 0',
      }}
    >
      <div style={{ width: '100%', maxWidth: '380px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button
          onClick={() => router.push(backTo)}
          aria-label="Back"
          style={{
            position: 'absolute',
            left: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            padding: '4px',
          }}
        >
          <ChevronLeftIcon />
        </button>
        <h1
          style={{
            margin: 0,
            fontFamily: SANS_DISPLAY,
            fontWeight: 600,
            fontSize: '17px',
            color: '#F5F0EA',
          }}
        >
          {title}
        </h1>
      </div>

      <div style={{ marginTop: '32px', width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {children}
      </div>

      <div style={{ height: '108px', flexShrink: 0 }} />
    </main>
  )
}

// Bölüm kartı - bir başlık + içindeki satırlar. Statistics kartıyla aynı
// yapı (bkz. app/profile/page.tsx).
export function SettingsCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div style={cardStyle}>
      {title && <div style={{ padding: '14px 20px 10px', ...labelStyle('#9A948C') }}>{title}</div>}
      {children}
    </div>
  )
}

export function SettingsRow({
  label,
  value,
  onClick,
  danger,
  chevron = true,
  rightElement,
  first = false,
}: {
  label: string
  value?: string
  onClick?: () => void
  danger?: boolean
  chevron?: boolean
  rightElement?: ReactNode
  // Bir kart başlığı OLMADAN kartın ilk satırıysa `first` ile üst kenarlığı
  // kaldırıyoruz - aksi halde kartın kendi kenarlığıyla üst üste binip
  // çift çizgi gibi görünürdü (bkz. Statistics kartında başlık olduğu için
  // bu durum hiç oluşmuyordu).
  first?: boolean
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderTop: first ? 'none' : '1px solid rgba(255, 255, 255, 0.06)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span
        style={{
          fontFamily: SANS,
          fontWeight: 400,
          fontSize: '15px',
          color: danger ? '#E39C8C' : '#F5F0EA',
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {value && <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: '14px', color: '#8F8A83' }}>{value}</span>}
        {rightElement}
        {chevron && onClick && <ChevronRightIcon />}
      </div>
    </div>
  )
}

// Bildirimler/Görünüm için anahtar (switch) - amber vurgu, aynı sakin dil.
export function Toggle({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      style={{
        width: '46px',
        height: '28px',
        borderRadius: '999px',
        border: '1px solid rgba(255, 178, 90, 0.3)',
        background: checked ? 'rgba(255, 178, 90, 0.35)' : 'rgba(255, 255, 255, 0.06)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 200ms ease-in-out',
        flexShrink: 0,
        padding: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '2px',
          left: checked ? '20px' : '2px',
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: checked ? '#F3CE8E' : '#8F8A83',
          transition: 'left 200ms ease-in-out, background 200ms ease-in-out',
        }}
      />
    </button>
  )
}
