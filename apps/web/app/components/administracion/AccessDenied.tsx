export interface AccessDeniedProps {
  title?: string
  message: string
}

export function AccessDenied({ title = 'Acceso denegado', message }: AccessDeniedProps) {
  return (
    <div>
      <div className="section-heading">
        <h1>{title}</h1>
        <p>{message}</p>
      </div>
    </div>
  )
}
