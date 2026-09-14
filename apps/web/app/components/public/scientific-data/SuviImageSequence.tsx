import Image from 'next/image'

import type { ScientificImage } from '@/app/lib/scientific-data'

export interface SuviImageSequenceProps {
  images: ScientificImage[]
}

function formatTimestamp(timestamp: string) {
  return `${timestamp.slice(0, 10)} ${timestamp.slice(11, 16)} UTC`
}

export function SuviImageSequence({ images }: SuviImageSequenceProps) {
  return (
    <ul aria-label="Secuencia de imágenes solares" className="data-image-grid">
      {images.map((image) => (
        <li key={image.timestamp}>
          <figure>
            <Image
              alt={image.alt}
              height={512}
              sizes="(max-width: 580px) 88vw, (max-width: 900px) 42vw, 280px"
              src={image.imageUrl}
              width={512}
            />
            <figcaption>{formatTimestamp(image.timestamp)}</figcaption>
          </figure>
        </li>
      ))}
    </ul>
  )
}
