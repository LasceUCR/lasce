import type { AcademicActivity } from '@/app/lib/academic-activities'
import { AcademicActivityCard } from './AcademicActivityCard'

export interface AcademicActivitiesSectionProps {
  activities: AcademicActivity[]
  id?: string
}

export function AcademicActivitiesSection({
  activities,
  id = 'academic-activities',
}: AcademicActivitiesSectionProps) {
  return (
    <section
      aria-labelledby="academic-activities-title"
      className="academic-activities page-width"
      id={id}
    >
      <div className="section-heading">
        <h2 id="academic-activities-title">Actividades académicas</h2>
        <p className="academic-activities-description">
          Talleres, cursos, charlas y actividades científicas y formativas organizadas o vinculadas
          al LASCE.
        </p>
      </div>

      {activities.length === 0 ? (
        <p className="content-empty" role="status">
          No hay actividades académicas disponibles en este momento.
        </p>
      ) : (
        <div className="academic-activities-list">
          {activities.map((activity) => (
            <AcademicActivityCard activity={activity} key={activity.slug} />
          ))}
        </div>
      )}
    </section>
  )
}
