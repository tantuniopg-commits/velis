'use client'

import { useEffect, useRef, useState } from 'react'
import { describeArcSegment } from './utils/geometry'

// Velis açılış animasyonu - sakin, lüks, kasıtlı (Apple/Nothing/Humane
// ilhamlı, gösterişsiz).
//
// Sahne 1: tamamen siyah ekran (#000000), ~0.4sn bekleme - logo yok,
// yazı yok, ses yok.
// Sahne 2: küçük, sıcak amber bir küre tam merkezde yavaşça belirir,
// ardından tek bir yavaş "nefes" pulse'u yapar (%100 -> %108 -> %100,
// 0.8sn, ease-in-out, sıçramasız).
// Sahne 3: beyaz seramik ritüel nesnesi yukarıdan çok yavaş/yumuşak
// iner (sıçrama/ivme sıçraması yok) ve amber çekirdek tam merkezinde
// hizalanacak şekilde durur - "çarpmıyor, yerini buluyor".
// Sahne 4: nesne yerleştikten sonra çekirdek parlaklaşır ve enerji
// aynı anda yukarı/aşağı doğru nesnenin içinde yayılır - elektrik/lazer/
// sıvı değil, seramiği yavaşça dolduran bir sıcaklık hissi (0.8sn).
// Sahne 5: enerji nesnenin iki ucuna ulaştıktan sonra, çevresindeki
// halka - sadece belirmek yerine - nesnenin enerjisinden "doğuyormuş"
// gibi, nesneye bitişik noktalardan başlayıp sağa/sola doğru büyüyerek
// ortaya çıkıyor. Halka tamamlanırken parlama azalıp sakinleşiyor.
// Sahne 6: her şey sakinleşiyor - amber çekirdek normal dinlenme
// parlaklığına dönüyor, parlama daha da yumuşuyor, hiçbir hareket/nefes
// kalmıyor. 0.4sn sonra logonun altında "VELIS" yazısı (SF Pro Display,
// Medium, hafif artırılmış tracking, sıcak beyaz) sadece opacity ile
// yumuşakça beliriyor. Tüm kompozisyon 1sn ekranda kalıp uygulamaya
// geçiliyor.

const BLACK_MS = 400
const APPEAR_MS = 700
const PULSE_MS = 800
const DESCEND_MS = 1100
const GLOW_MS = 800
const RING_GROW_MS = 900
const SETTLE_MS = 400
const TEXT_FADE_MS = 500
const FINAL_HOLD_MS = 1000

const OBJECT_WIDTH = 13
const OBJECT_HEIGHT = 260
const OBJECT_START_OFFSET = 220

const RING_R = 105
const RING_GAP_DEG = 12
const RING_GAP_HALF_DEG = RING_GAP_DEG / 2

type Stage = 'black' | 'appear' | 'pulse' | 'descend' | 'glow' | 'ring' | 'settle' | 'text' | 'final'

const STAGE_ORDER: Stage[] = ['black', 'appear', 'pulse', 'descend', 'glow', 'ring', 'settle', 'text', 'final']

export default function IntroSplash({ onFinish }: { onFinish: () => void }) {
  const [stage, setStage] = useState<Stage>('black')
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const finishedRef = useRef(false)

  useEffect(() => {
    const timers = timersRef.current
    const finish = () => {
      if (finishedRef.current) return
      finishedRef.current = true
      onFinish()
    }
    const schedule = (fn: () => void, delay: number) => {
      timers.push(setTimeout(fn, delay))
    }
    schedule(() => setStage('appear'), BLACK_MS)
    schedule(() => setStage('pulse'), BLACK_MS + APPEAR_MS)
    schedule(() => setStage('descend'), BLACK_MS + APPEAR_MS + PULSE_MS)
    schedule(() => setStage('glow'), BLACK_MS + APPEAR_MS + PULSE_MS + DESCEND_MS)
    schedule(() => setStage('ring'), BLACK_MS + APPEAR_MS + PULSE_MS + DESCEND_MS + GLOW_MS)
    schedule(() => setStage('settle'), BLACK_MS + APPEAR_MS + PULSE_MS + DESCEND_MS + GLOW_MS + RING_GROW_MS)
    schedule(
      () => setStage('text'),
      BLACK_MS + APPEAR_MS + PULSE_MS + DESCEND_MS + GLOW_MS + RING_GROW_MS + SETTLE_MS
    )
    schedule(
      () => setStage('final'),
      BLACK_MS + APPEAR_MS + PULSE_MS + DESCEND_MS + GLOW_MS + RING_GROW_MS + SETTLE_MS + TEXT_FADE_MS
    )
    const total =
      BLACK_MS +
      APPEAR_MS +
      PULSE_MS +
      DESCEND_MS +
      GLOW_MS +
      RING_GROW_MS +
      SETTLE_MS +
      TEXT_FADE_MS +
      FINAL_HOLD_MS
    schedule(() => finish(), total)
    // Son çare: yukarıdaki zamanlayıcı herhangi bir nedenle kaybolursa
    // (WKWebView throttling vb.) splash tam-ekran takılı kalmasın - finish()
    // idempotent (bkz. finishedRef).
    schedule(() => finish(), total + 4000)
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Aşama sırası - "X aşamasından itibaren doğru" sorgularını kısa/güvenli
  // tutmak için (yeni sahneler eklendikçe genişleyecek).
  const stageIndex = STAGE_ORDER.indexOf(stage)
  const atLeast = (s: Stage) => stageIndex >= STAGE_ORDER.indexOf(s)

  const sphereVisible = atLeast('appear')
  const pulsing = stage === 'pulse'
  const objectArrived = atLeast('descend')
  const objectVisible = objectArrived
  // Halka ve nesnenin iç enerjisi bir kere belirdikten sonra asla geri
  // çekilmiyor - sadece çekirdeğin KENDİ parlaklığı Sahne 6'da sakinleşiyor.
  const energized = atLeast('glow')
  const coreElevated = stage === 'glow' || stage === 'ring'
  const ringGrowing = atLeast('ring')
  // Parlama, halka büyürken AYNI ANDA azalıyor (sonradan değil) - böylece
  // "halka tamamlanırken parlama azalıyor" tam olarak RING_GROW_MS içinde
  // ikisi birlikte biter.
  const ringCalm = atLeast('ring')
  const textVisible = atLeast('text')

  // Halka: nesneye bitişik dört noktadan (üst boşluğun iki yanı, alt
  // boşluğun iki yanı) başlayıp sağa/sola doğru dışarı büyüyen dört
  // çeyrek yay. Tamamlandığında görsel olarak önceki iki büyük (168deg)
  // yayla birebir aynı şekli oluşturuyor.
  const topRightD = describeArcSegment(RING_R, 270 + RING_GAP_HALF_DEG, 360)
  const bottomRightD = describeArcSegment(RING_R, 90 - RING_GAP_HALF_DEG, 0)
  const topLeftD = describeArcSegment(RING_R, 270 - RING_GAP_HALF_DEG, 180)
  const bottomLeftD = describeArcSegment(RING_R, 90 + RING_GAP_HALF_DEG, 180)

  const ringPathStyle = {
    fill: 'none',
    stroke: '#F6F2EB',
    strokeWidth: 5,
    strokeLinecap: 'round' as const,
    strokeDasharray: '100 100',
    strokeDashoffset: ringGrowing ? 0 : 100,
    transition: `stroke-dashoffset ${RING_GROW_MS}ms ease-out`,
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      {/* Sabit boyutlu bir çıpa - nesnenin dinlenme konumu/boyutu ve
          çekirdeğin tam merkezi bu kutuya göre hizalanıyor. */}
      <div style={{ position: 'relative', width: `${OBJECT_WIDTH}px`, height: `${OBJECT_HEIGHT}px` }}>
        {/* Halka - nesnenin enerjisinden doğuyormuş gibi, dört noktadan
            aynı anda dışarı doğru "çiziliyor" (pathLength tabanlı
            stroke-dasharray/dashoffset ile). Sadece belirmiyor, büyüyor. */}
        <svg
          viewBox="-120 -150 240 300"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '240px',
            height: '300px',
            transform: 'translate(-50%, -50%)',
            opacity: energized ? 1 : 0,
            filter: ringCalm
              ? 'drop-shadow(0 0 8px rgba(255, 178, 90, 0.3)) drop-shadow(0 0 16px rgba(255, 178, 90, 0.15))'
              : 'drop-shadow(0 0 11px rgba(255, 178, 90, 0.42)) drop-shadow(0 0 20px rgba(255, 178, 90, 0.22))',
            transition: `opacity 250ms ease-out, filter ${RING_GROW_MS}ms ease-out`,
          }}
        >
          <path pathLength={100} d={topRightD} style={ringPathStyle} />
          <path pathLength={100} d={bottomRightD} style={ringPathStyle} />
          <path pathLength={100} d={topLeftD} style={ringPathStyle} />
          <path pathLength={100} d={bottomLeftD} style={ringPathStyle} />
        </svg>

        {/* Beyaz seramik ritüel nesnesi - yukarıdan çok yavaş/yumuşak
            iner, hiç sıçramadan tam merkezde durur. Mat, yansımasız,
            metalik olmayan yumuşak dikey gradyan. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            borderRadius: '999px',
            background: 'linear-gradient(90deg, #DAD5CE 0%, #F1EEE9 20%, #ECE8E3 50%, #F1EEE9 80%, #DAD5CE 100%)',
            opacity: objectVisible ? 1 : 0,
            transform: `translateY(${objectArrived ? 0 : -OBJECT_START_OFFSET}px)`,
            transition: objectArrived
              ? `transform ${DESCEND_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity 350ms ease-out`
              : 'none',
          }}
        >
          {/* Enerji / sıcaklık - çekirdekten aynı anda yukarı ve aşağı
              yayılıyor. Katmanlı amber gradyan + soft-light blend,
              seramiğin kendi rengini görünür tutuyor ("sadece iç ışık
              değişiyor, nesne beyaz kalıyor"). */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              width: '100%',
              height: energized ? '86%' : '0%',
              transform: 'translateY(-50%)',
              borderRadius: '999px',
              background:
                'radial-gradient(ellipse at center, #FFB347 0%, #FFB347 24%, #F08A24 54%, rgba(240, 138, 36, 0.4) 72%, rgba(240, 138, 36, 0) 88%)',
              opacity: energized ? 0.85 : 0,
              filter: 'blur(6px)',
              mixBlendMode: 'soft-light',
              transition: `height ${GLOW_MS}ms ease-in-out, opacity ${GLOW_MS}ms ease-in-out`,
            }}
          />
        </div>

        {/* Amber küre - sıcak bir kor gibi, çıpanın tam merkezinde ve
            nesne inerken de sabit kalıyor. Yavaşça belirir, bir kere
            nefes alır gibi hafifçe büyür/küçülür, nesne yerleşince
            parlaklaşır. */}
        <div
          className={pulsing ? 'velis-sphere velis-sphere--pulse' : 'velis-sphere'}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 35% 30%, #FFD9A0 0%, #FFB347 40%, #F08A24 75%, #D9701A 100%)',
            boxShadow: coreElevated
              ? '0 0 12px 4px rgba(255, 178, 90, 0.55), 0 0 22px 7px rgba(240, 138, 36, 0.28)'
              : '0 0 8px 2px rgba(255, 178, 90, 0.35), 0 0 16px 5px rgba(240, 138, 36, 0.15)',
            opacity: sphereVisible ? 1 : 0,
            transition: `opacity ${APPEAR_MS}ms ease-in-out, box-shadow ${SETTLE_MS}ms ease-in-out`,
          }}
        />
      </div>

      {/* Sahne 6: logo tamamlandıktan 0.4sn sonra, altında sadece opacity
          ile beliren "VELIS" yazısı - başka hiçbir hareket yok. */}
      <div
        aria-hidden
        style={{
          marginTop: '40px',
          fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
          fontWeight: 500,
          fontSize: '46px',
          letterSpacing: '0.22em',
          color: '#F6F2EB',
          opacity: textVisible ? 1 : 0,
          transition: `opacity ${TEXT_FADE_MS}ms ease-out`,
        }}
      >
        VELIS
      </div>
    </div>
  )
}
