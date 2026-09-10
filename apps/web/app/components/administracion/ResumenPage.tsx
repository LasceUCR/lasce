import { ContentFlag } from '@/app/components/public/topic/ContentFlag'

import { StatCard, type StatCardTone } from './StatCard'
import { StatusPill, type StatusTone } from './StatusPill'

const statCards: { label: string; value: string; tone: StatCardTone }[] = [
  { label: 'Investigadores', value: '18', tone: 'blue' },
  { label: 'Proyectos activos', value: '7', tone: 'cyan' },
  { label: 'Instrumentos', value: '24', tone: 'teal' },
  { label: 'Descargas / mes', value: '1,204', tone: 'orange' },
]

const activityItems: { title: string; timestamp: string; actor: string }[] = [
  { title: 'Nueva publicación agregada', timestamp: 'Hace 12 min', actor: 'Administración' },
  { title: 'Descarga de dataset GOES', timestamp: 'Hace 24 min', actor: 'Usuario registrado' },
  { title: 'Instrumento actualizado', timestamp: 'Hace 48 min', actor: 'Administración' },
  { title: 'Nuevo usuario registrado', timestamp: 'Hace 1 h', actor: 'Sistema' },
  { title: 'Pipeline finalizado correctamente', timestamp: 'Hace 1 h', actor: 'Worker' },
]

type StatusItem = { name: string; status: string; tone: StatusTone }

const services: StatusItem[] = [
  { name: 'API pública', status: 'Operativa', tone: 'green' },
  { name: 'Base de datos PostgreSQL', status: 'Operativa', tone: 'green' },
  { name: 'Cola de trabajos (Redis)', status: 'Operativa', tone: 'green' },
  { name: 'Almacenamiento MinIO', status: 'En espera', tone: 'orange' },
]

const pipelines: StatusItem[] = [
  { name: 'Ingesta GOES/XRS', status: 'Completado', tone: 'green' },
  { name: 'Sincronización ROSAC', status: 'Programado', tone: 'blue' },
  { name: 'Reporte semanal Kp/Dst', status: 'En espera', tone: 'orange' },
  { name: 'Respaldo de base de datos', status: 'Completado', tone: 'green' },
]

export function ResumenPage() {
  return (
    <div>
      <div className="section-heading">
        <h1>Resumen</h1>
        <p>Estado general del laboratorio y sus sistemas.</p>
      </div>

      <ContentFlag
        label="Información provisional"
        message="El contenido de esta página es preliminar y está sujeto a revisión."
      />

      <div className="indicator-grid">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <section className="surface-card admin-panel" aria-labelledby="admin-activity-title">
        <h2 id="admin-activity-title">Actividad reciente</h2>
        <ol className="admin-activity-list">
          {activityItems.map((item, index) => (
            <li key={item.title}>
              <span className="admin-activity-index" aria-hidden="true">
                {index + 1}
              </span>
              <strong className="admin-activity-title">{item.title}</strong>
              <span className="admin-activity-time">
                {item.timestamp} · {item.actor}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="section-heading admin-panel">
        <h2>Estado de infraestructura y procesos</h2>
      </div>
      <div className="card-grid card-grid-2">
        <section className="surface-card" aria-labelledby="admin-services-title">
          <h2 id="admin-services-title">Servicios</h2>
          <ul className="admin-status-list">
            {services.map((service) => (
              <li key={service.name}>
                <span className="admin-status-name">
                  <span
                    aria-hidden="true"
                    className={`status-pill-dot status-pill-${service.tone}`}
                  />
                  {service.name}
                </span>
                <span className="admin-status-value">{service.status}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="surface-card" aria-labelledby="admin-pipelines-title">
          <h2 id="admin-pipelines-title">Tareas y pipelines</h2>
          <ul className="admin-status-list">
            {pipelines.map((pipeline) => (
              <li key={pipeline.name}>
                <span>{pipeline.name}</span>
                <StatusPill label={pipeline.status} showDot={false} tone={pipeline.tone} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
