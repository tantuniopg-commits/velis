// Durum çubuğu (saat, Dynamic Island, pil) zemini. Sayfa viewportFit: 'cover'
// ile ekranın en üstüne kadar çiziliyor (bkz. layout.tsx) - kaydırılan içerik
// bu yüzden durum çubuğunun arkasına girip orada okunuyordu. Bu sabit katman
// güvenli alanı uygulamanın zemin rengiyle kapatıyor ve alt kenarında
// yumuşakça soluyor (alt menüdeki geçişle aynı dil, bkz. BottomNav.tsx).
//
// zIndex 9: içerikten yukarıda, alt menüden (10) ve tüm tam ekran katmanlardan
// (40+) aşağıda - onların kendi zeminleri zaten bu alanı kaplıyor.
export default function StatusBarScrim() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 'calc(env(safe-area-inset-top) + 18px)',
        background: 'linear-gradient(to bottom, #050505 calc(100% - 18px), rgba(5, 5, 5, 0))',
        pointerEvents: 'none',
        zIndex: 9,
      }}
    />
  )
}
