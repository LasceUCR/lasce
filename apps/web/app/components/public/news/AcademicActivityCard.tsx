import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

import { Button } from '@/app/components/public/Button'
import type { AcademicActivity } from '@/app/lib/academic-activities'

export interface AcademicActivityCardProps {
  activity: AcademicActivity
}

export function AcademicActivityCard({ activity }: AcademicActivityCardProps) {
  return (
    <article className="surface-card news-card academic-activity-card">
      <div
        className={`news-card-image${activity.imageAlt === '' ? ' news-card-image-decorative' : ''}`}
      >
        <Image
          alt={activity.imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, 320px"
          src={activity.imageUrl}
        />
      </div>

      <div className="news-card-content">
        <div className="academic-activity-card-header">
          <span className="academic-activity-badge">Actividad académica</span>
          {activity.category ? (
            <span className="academic-activity-category">{activity.category}</span>
          ) : null}
        </div>

        <h3>{activity.title}</h3>

        <p className="news-meta">
          {activity.date}
          {activity.location ? ` · ${activity.location}` : ''}
        </p>

        {activity.abstract ? <p className="news-abstract">{activity.abstract}</p> : null}

        <div className="academic-activity-action">
          <Button
            href={`/noticias/actividades/${activity.slug}`}
            icon={<ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />}
            variant="primary"
          >
            Ver detalles de la actividad
          </Button>
        </div>
      </div>
    </article>
  )
}
