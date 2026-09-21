'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'

// Yuvarlak bir kabın içini dolduran profil fotoğrafı. Kabın kendisi (boyut,
// amber halka, ışıma) çağıran yerde - bu sadece içeriği: fotoğraf varsa onu,
// yoksa ya da yüklenemezse (ağ hatası, silinmiş fotoğraf) `fallback`'i (baş
// harfler) gösteriyor. Böylece fotoğrafı olmayan herkes eskisi gibi görünüyor.
export default function AvatarPhoto({ src, fallback }: { src?: string; fallback: ReactNode }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  if (!src || failedSrc === src) return <>{fallback}</>
  return (
    // eslint-disable-next-line @next/next/no-img-element -- statik export (Capacitor), next/image optimizasyonu yok; kaynak zaten 320px'e küçültülmüş
    <img
      src={src}
      alt=""
      draggable={false}
      onError={() => setFailedSrc(src)}
      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
    />
  )
}
