export interface AdminPlaceholderProps {
  title: string
  description: string
}

export function AdminPlaceholder({ title, description }: AdminPlaceholderProps) {
  return (
    <div>
      <div className="section-heading">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <p className="content-empty">Contenido en preparación</p>
    </div>
  )
}
