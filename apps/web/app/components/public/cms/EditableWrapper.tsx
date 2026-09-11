import { Button } from "../Button";
import type { ReactNode } from 'react'

 
export interface EditableWrapperProps {
  children: ReactNode
  className?: string
  // TODO: try refactoring to work wwith useState
  editable?: boolean
  onEdit?: () => void
}

export function EditableWrapper({
  children,
  editable = false,
  onEdit,
  className,
}: EditableWrapperProps) {

  if (!editable) {
    return children
  }

  const classes = ['editable', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      {children}

      <Button className="editable-button" onClick={onEdit} variant="secondary">Edit ✎</Button>
    </div>
  )
}