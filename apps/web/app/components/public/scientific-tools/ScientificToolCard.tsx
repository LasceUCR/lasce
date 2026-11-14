'use client'

import Image from 'next/image'
import { ExternalLink, FlaskConical } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { InfoCard } from '@/app/components/public/topic/InfoCard'
import { contentLangAttribute } from '@/app/lib/i18n/content/resolve'
import type { ScientificTool } from '@/app/lib/scientific-tool-records'

export interface ScientificToolCardProps {
  tool: Pick<ScientificTool, 'name' | 'description' | 'href' | 'imageUrl' | 'contentLocale'>
}

/** One tool: its image, name, description and a button that opens it in a new tab. */
export function ScientificToolCard({ tool }: ScientificToolCardProps) {
  const t = useTranslations('scientificTools.list')
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const image = tool.imageUrl && tool.imageUrl !== failedImage ? tool.imageUrl : null

  return (
    <InfoCard
      title={tool.name}
      description={tool.description}
      lang={contentLangAttribute(tool.contentLocale)}
      icon={
        image ? (
          <Image
            src={image}
            alt=""
            fill
            sizes="(max-width: 760px) 100vw, 280px"
            // Uploaded images are served by the application already sized.
            unoptimized={image.startsWith('/api/')}
            onError={() => setFailedImage(image)}
          />
        ) : (
          <FlaskConical aria-hidden="true" size={48} strokeWidth={1.4} />
        )
      }
      layout="horizontal"
      action={
        <Button
          href={tool.href}
          icon={<ExternalLink aria-hidden="true" size={18} strokeWidth={1.8} />}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t('access', { title: tool.name })}
        </Button>
      }
    />
  )
}
