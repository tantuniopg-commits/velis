'use client'

// The Digital Ritual Object - a premium ceramic device, not a cigarette.
// Perfectly vertical, centered, symmetrical. No rotation, no position
// animation, ever.
//
// The amber core is a small, fixed-size bead sitting at the object's
// exact center - the same size and position always. Activation is driven
// entirely by the `activating` prop (owned by the parent's ~5s timer):
// while true, a softer glow spreads from the core outward to both ends
// of the ceramic (never painting it fully orange - mix-blend-mode keeps
// the ceramic tone visible through the glow). It stays fully spread
// through the ritual. Touch-and-hold on the core is now what drives the
// ritual timer itself (bkz. app/page.tsx handlePressStart/handlePressEnd) -
// while held, the core's living-energy breath (irregular multi-stop
// keyframe) runs; released, the breath simply pauses and the hold-boost
// warmth recedes, but the base glow stays lit (spread) so the object never
// goes dark mid-ritual. On completion the light retreats back to the core
// and fades, leaving only the calm ceramic body.

export const ACTIVATING_MS = 5000

const HOLD_TRANSITION_MS = 380
const RETREAT_MS = 1700

export default function RitualObject({
  activating = false,
  alive = false,
  holding = false,
  completed = false,
  attract = false,
}: {
  activating?: boolean
  alive?: boolean
  holding?: boolean
  completed?: boolean
  // İlk kayıttan önceki ilk ritüelde - kullanıcı dokunabileceğini henüz
  // bilmiyor. Amber çekirdek yavaşça büyüyüp küçülerek ve parlayarak
  // dikkat çekiyor (bkz. app/page.tsx, app/globals.css ritualBeadAttract).
  // Sadece idle'da anlamlı - activating/alive/completed hepsi false iken.
  attract?: boolean
}) {
  const asleep = completed
  const spread = (activating || alive) && !asleep
  // Nefes alma/verme döngüsü artık BASILI TUTMAYA bağlı - parmak kalkınca
  // duruyor (ASLA sıfırlanmıyor/yeniden başlamıyor), obje yine de yanık
  // kalıyor (bkz. `spread`, hâlâ tüm ritüel boyunca true).
  const living = alive && holding && !asleep
  const held = holding && !asleep

  return (
    <div
      className="ritual-wrapper"
      style={{
        position: 'relative',
        display: 'inline-flex',
        isolation: 'isolate',
        transform: `scale(${held ? 1.02 : 1})`,
        transformOrigin: 'center center',
        transition: `transform ${HOLD_TRANSITION_MS}ms ease-in-out`,
      }}
    >
      {/* Very soft ambient bleed around the object - never neon, barely there.
          On hold it widens/blurs a touch more for a slightly stronger glow. */}
      <div
        aria-hidden
        className="ritual-halo"
        style={{
          position: 'absolute',
          inset: held ? '-38px' : '-30px',
          borderRadius: '999px',
          background:
            'radial-gradient(ellipse at center, rgba(255, 178, 90, 0.2) 0%, rgba(255, 178, 90, 0) 70%)',
          opacity: spread ? 1 : 0,
          filter: `blur(${held ? 20 : 16}px)`,
          transition: `opacity ${asleep ? RETREAT_MS : ACTIVATING_MS}ms ease-in-out, inset ${HOLD_TRANSITION_MS}ms ease-in-out, filter ${HOLD_TRANSITION_MS}ms ease-in-out`,
          pointerEvents: 'none',
        }}
      />

      {/* Core bloom - sits behind the ceramic and bleeds a few px past its
          silhouette, so the lit core reads larger than its own body and
          softly haloes the object against the dark background. */}
      <div
        aria-hidden
        className="ritual-core-bloom"
        style={{
          position: 'absolute',
          top: '50%',
          left: '-4px',
          width: 'calc(100% + 8px)',
          transform: 'translateY(-50%)',
          height: spread ? '90%' : '0%',
          borderRadius: '999px',
          background:
            'radial-gradient(ellipse at center, rgba(255, 179, 71, 0.65) 0%, rgba(240, 138, 36, 0.38) 45%, rgba(240, 138, 36, 0) 82%)',
          opacity: spread ? 0.7 : 0,
          filter: 'blur(14px)',
          transition: asleep
            ? `height ${RETREAT_MS}ms ease-in-out, opacity ${RETREAT_MS}ms ease-in-out`
            : `height ${ACTIVATING_MS}ms ease-in-out, opacity ${ACTIVATING_MS}ms ease-in-out`,
          pointerEvents: 'none',
        }}
      />

      {/* Ceramic body */}
      <div
        aria-hidden
        className="ritual-ceramic-body"
        style={{
          position: 'relative',
          width: 'clamp(10px, 1.6vw, 16px)',
          height: 'clamp(260px, 42vh, 400px)',
          borderRadius: '999px',
          overflow: 'hidden',
          background:
            'linear-gradient(90deg, #DAD5CE 0%, #F1EEE9 20%, #ECE8E3 50%, #F1EEE9 80%, #DAD5CE 100%)',
          boxShadow: `
            inset -2px 0 3px rgba(0, 0, 0, 0.07),
            inset 2px 0 2px rgba(255, 255, 255, 0.5),
            0 24px 50px rgba(0, 0, 0, 0.4),
            0 4px 10px rgba(0, 0, 0, 0.25)
          `,
        }}
      >
        {/* Amber glow - spreads from the core outward to both ends over the
            ~10s activation, then stays fully spread through the ritual.
            Layered gradient (bright center -> deeper edge -> soft fade) -
            rendered at normal blend so it reads as a clearly visible glow,
            with the gradient's own fade (not the blend mode) keeping the
            ceramic tone visible at the tips. */}
        <div
          className={`ritual-core${living ? ' ritual-core--alive' : ''}`}
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            width: '100%',
            transform: 'translateY(-50%)',
            height: spread ? '90%' : '0%',
            borderRadius: '999px',
            background:
              'radial-gradient(ellipse at center, #FFC97A 0%, #FFB347 22%, #F08A24 50%, rgba(240, 138, 36, 0.55) 70%, rgba(240, 138, 36, 0) 90%)',
            opacity: spread ? 0.95 : 0,
            filter: 'blur(5px)',
            mixBlendMode: 'normal',
            transition: asleep
              ? `height ${RETREAT_MS}ms ease-in-out, opacity ${RETREAT_MS}ms ease-in-out`
              : `height ${ACTIVATING_MS}ms ease-in-out, opacity ${ACTIVATING_MS}ms ease-in-out`,
            pointerEvents: 'none',
          }}
        />

        {/* Hold boost - a separate warmth/depth layer so it never fights the
            always-running living-energy keyframe on the core above it. */}
        <div
          aria-hidden
          className="ritual-hold-boost"
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            width: '100%',
            transform: 'translateY(-50%)',
            height: spread ? '90%' : '0%',
            borderRadius: '999px',
            background:
              'radial-gradient(ellipse at center, rgba(255, 214, 160, 1) 0%, rgba(255, 165, 80, 0.8) 40%, rgba(255, 165, 80, 0) 76%)',
            opacity: held ? 0.4 : 0,
            filter: `blur(${held ? 10 : 7}px)`,
            mixBlendMode: 'soft-light',
            transition: `opacity ${HOLD_TRANSITION_MS}ms ease-in-out, filter ${HOLD_TRANSITION_MS}ms ease-in-out`,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Amber core - a small, fixed-size bead at the exact center. Same
          size/position always (idle, activating, or mid-ritual); only its
          brightness/warmth shifts with state. */}
      <div
        aria-hidden
        className={`ritual-bead${living ? ' ritual-bead--alive' : ''}${attract && !spread ? ' ritual-bead--attract' : ''}`}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '13px',
          height: '13px',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(circle at 35% 30%, #FFF3D9 0%, #FFD9A0 30%, #FFB347 55%, #F08A24 82%, #D9701A 100%)',
          boxShadow: held
            ? '0 0 16px 5px rgba(255, 200, 130, 0.85), 0 0 30px 10px rgba(240, 138, 36, 0.45)'
            : '0 0 12px 4px rgba(255, 200, 130, 0.7), 0 0 22px 7px rgba(240, 138, 36, 0.35)',
          opacity: asleep ? 0 : 1,
          transition: `opacity ${asleep ? RETREAT_MS : 500}ms ease-in-out, box-shadow ${HOLD_TRANSITION_MS}ms ease-in-out`,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
